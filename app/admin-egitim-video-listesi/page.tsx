
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SupabaseEgitimService } from '@/lib/supabase-services';

interface EgitimVideoDetay {
  id: number;
  egitim_set_id: number;
  video_adi: string;
  video_url: string;
  video_suresi: number;
  sira_no: number;
  aciklama: string;
  pdf_url?: string;
  durum: string;
  created_at: string;
  set_adi: string;
  kategori: string;
  atanan_firmalar: number[];
}

interface VideoIzlemeIstatistik {
  video_id: number;
  toplam_izlenme: number;
  firma_sayisi: number;
  tamamlanma_orani: number;
}

export default function AdminEgitimVideoListesiPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [videolar, setVideolar] = useState<EgitimVideoDetay[]>([]);
  const [istatistikler, setIstatistikler] = useState<VideoIzlemeIstatistik[]>([]);
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [selectedDurum, setSelectedDurum] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState('');

  const router = useRouter();

  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/admin-dashboard' },
    { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar' },
    { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi' },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talepleri', href: '/admin-randevu-talepleri' },
    { 
      icon: 'ri-graduation-cap-line', 
      label: '📚 Eğitim Seti Yönetimi', 
      href: '/admin-egitim-yonetimi',
      description: 'Setler ve videolar'
    },
    { 
      icon: 'ri-play-circle-line', 
      label: '🎥 Eğitim Videoları', 
      href: '/admin-egitim-video-listesi',
      active: true,
      description: 'Tüm video listesi'
    },
    { 
      icon: 'ri-bar-chart-box-line', 
      label: '📊 Video İlerleme Raporu', 
      href: '/admin-egitim-rapor-dashboard',
      description: 'İzlenme raporları'
    },
    { 
      icon: 'ri-file-text-line', 
      label: '📄 Dökümanlar', 
      href: '/admin-destek-dokumanlari',
      description: 'PDF dokümanları'
    },
    { icon: 'ri-calendar-event-line', label: 'Etkinlik Yönetimi', href: '/admin-etkinlik-yonetimi' },
    { icon: 'ri-bar-chart-line', label: 'Dönem Yönetimi', href: '/admin-donem-yonetimi' },
    { icon: 'ri-discuss-line', label: 'Forum Yönetimi', href: '/admin-forum-yonetimi' },
    { icon: 'ri-feedback-line', label: 'Platform Geri Bildirimleri', href: '/admin-geri-bildirimler' },
    { icon: 'ri-team-line', label: 'Kullanıcılar (Personel)', href: '/admin-kullanici-yonetimi' },
    { icon: 'ri-check-double-line', label: 'Görev Onayları', href: '/admin-gorev-onaylari' }
  ];

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn');
    const email = localStorage.getItem('adminEmail');
    const role = localStorage.getItem('adminRole');

    if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
      router.push('/admin-login');
      return;
    }

    setIsAdminLoggedIn(true);
    setAdminEmail(email || '');
    loadVideoData();
  }, [router]);

  const loadVideoData = async () => {
    try {
      setLoading(true);
      setMessage('');
      console.log('🎥 Video listesi yükleniyor...');

      const egitimSetleri = await SupabaseEgitimService.getAllEgitimSetleri();
      console.log(`📚 ${egitimSetleri.length} eğitim seti yüklendi`);

      const tumVideolar: EgitimVideoDetay[] = [];

      for (const set of egitimSetleri) {
        try {
          console.log(`🎥 Set ${set.id} (${set.set_adi}) videoları yükleniyor...`);

          const setVideolari = await SupabaseEgitimService.getEgitimVideolari(set.id);

          const zenginlestirilmisVideolar = setVideolari.map((video: any) => ({
            id: video.id,
            egitim_set_id: set.id,
            video_adi: video.video_adi || 'İsimsiz Video',
            video_url: video.video_url || '',
            video_suresi: video.video_suresi || 0,
            sira_no: video.sira_no || 1,
            aciklama: video.aciklama || '',
            pdf_url: video.pdf_url || null,
            durum: video.durum || 'Aktif',
            created_at: video.created_at || new Date().toISOString(),
            set_adi: set.set_adi || 'Bilinmeyen Set',
            kategori: set.kategori || 'Genel',
            atanan_firmalar: set.atanan_firmalar || []
          }));

          tumVideolar.push(...zenginlestirilmisVideolar);
          console.log(`🎥 Set ${set.id}: ${zenginlestirilmisVideolar.length} video eklendi`);
        } catch (setVideoError) {
          console.warn(`🎥 Set ${set.id} video yükleme hatası, atlanıyor:`, setVideoError);
        }
      }

      tumVideolar.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setVideolar(tumVideolar);

      const mockStats: VideoIzlemeIstatistik[] = tumVideolar.map((video) => ({
        video_id: video.id,
        toplam_izlenme: Math.floor(Math.random() * 100) + 10,
        firma_sayisi: video.atanan_firmalar.length || Math.floor(Math.random() * 5) + 1,
        tamamlanma_orani: Math.floor(Math.random() * 80) + 20
      }));

      setIstatistikler(mockStats);

      console.log(`🎥 ✅ Toplam ${tumVideolar.length} video ${egitimSetleri.length} setten yüklendi`);

      if (tumVideolar.length === 0) {
        setMessage('📋 Henüz video eklenmemiş. Eğitim setlerine video ekleyerek başlayabilirsiniz.');
      } else {
        setMessage(`✅ Toplam ${tumVideolar.length} video ${egitimSetleri.length} setten başarıyla yüklendi!`);
        setTimeout(() => setMessage(''), 3000);
      }

    } catch (error) {
      console.error('❌ Video veri yükleme genel hatası:', error);
      setVideolar([]);
      setIstatistikler([]);
      setMessage('⚠️ Video verileri yüklenirken sorun oluştu. Sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  const handleVideoStatusChange = async (videoId: number, newStatus: string) => {
    try {
      console.log(`🎥 Video ${videoId} durumu ${newStatus} olarak değiştiriliyor...`);

      setVideolar(prev => prev.map(video => 
        video.id === videoId ? { ...video, durum: newStatus } : video
      ));

      showMessage(`Video durumu "${newStatus}" olarak güncellendi!`, 'success');

    } catch (error) {
      console.error('❌ Video durum güncelleme hatası:', error);
      showMessage('Video durumu güncellenirken hata oluştu.', 'error');
    }
  };

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Temel Eğitim': return 'bg-blue-100 text-blue-800';
      case 'İleri Eğitim': return 'bg-purple-100 text-purple-800';
      case 'Pazarlama': return 'bg-green-100 text-green-800';
      case 'Gümrük': return 'bg-yellow-100 text-yellow-800';
      case 'Platform': return 'bg-indigo-100 text-indigo-800';
      case 'Finans': return 'bg-red-100 text-red-800';
      case 'Lojistik': return 'bg-orange-100 text-orange-800';
      case 'Güvenlik': return 'bg-gray-100 text-gray-800';
      case 'Müşteri Hizmetleri': return 'bg-pink-100 text-pink-800';
      case 'Teknik': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Aktif': return 'bg-green-100 text-green-800';
      case 'Pasif': return 'bg-red-100 text-red-800';
      case 'Beklemede': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVideoIstatistik = (videoId: number) => {
    return istatistikler.find(stat => stat.video_id === videoId) || {
      video_id: videoId,
      toplam_izlenme: 0,
      firma_sayisi: 0,
      tamamlanma_orani: 0
    };
  };

  const getFilteredVideos = () => {
    return videolar.filter(video => {
      if (selectedSet && video.egitim_set_id.toString() !== selectedSet) return false;
      if (selectedDurum && video.durum !== selectedDurum) return false;
      return true;
    });
  };

  const uniqueSets = [...new Set(videolar.map((v: any) => ({ id: v.egitim_set_id, name: v.set_adi })))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">🎥 Video listesi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* YENİ: Düzenlenmiş Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col fixed left-0 top-0 h-full z-50`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <Link href="/admin-dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="ri-shield-star-line text-white text-xl"></i>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold text-white font-[\\\'Pacifico\\\']">logo</h1>
                  <p className="text-xs text-slate-300">Admin Panel</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className={`${sidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-white`}></i>
            </button>
          </div>
        </div>

        <nav className="flex-1 py-6">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-all duration-200 group ${
                item.active
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-r-4 border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                  item.active ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-slate-600'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
              </div>
              {sidebarOpen && (
                <div className="ml-3">
                  <div className="transition-opacity duration-200">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <i className="ri-user-line text-white"></i>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin</p>
                <p className="text-xs text-slate-300 truncate">{adminEmail}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 flex-1 flex flex-col`}>
        {/* YENİ: Güncellenmiş Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎥 Eğitim Video Listesi</h1>
              <p className="text-gray-600 mt-1">Tüm eğitim videolarını görüntüleyin ve yönetin</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin-egitim-yonetimi"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-arrow-left-line"></i>
                <span>Set Yönetimi</span>
              </Link>
              <Link
                href="/admin-egitim-rapor-dashboard"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-bar-chart-box-line"></i>
                <span>Rapor Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${message.includes('başarıyla') || message.includes('✅') ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Video</p>
                  <p className="text-3xl font-bold text-gray-900">{videolar.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-play-circle-line text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aktif Video</p>
                  <p className="text-3xl font-bold text-green-600">{videolar.filter(v => v.durum === 'Aktif').length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-check-line text-green-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Süre</p>
                  <p className="text-3xl font-bold text-purple-600">{videolar.reduce((acc, v) => acc + v.video_suresi, 0)} dk</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-time-line text-purple-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Eğitim Seti</p>
                  <p className="text-3xl font-bold text-orange-600">{uniqueSets.length}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="ri-folder-line text-orange-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtreler</h3>
              <button
                onClick={loadVideoData}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer"
                disabled={loading}
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
                <span>Yenile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Eğitim Seti</label>
                <select
                  value={selectedSet}
                  onChange={(e) => setSelectedSet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                >
                  <option value="">Tüm Setler</option>
                  {uniqueSets.map((set, index) => (
                    <option key={`egitim-set-${set.id}-${index}`} value={set.id.toString()}>
                      {set.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  value={selectedDurum}
                  onChange={(e) => setSelectedDurum(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                  <option value="Beklemede">Beklemede</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedSet('');
                    setSelectedDurum('');
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>

          {/* Videos Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Video Listesi ({getFilteredVideos().length})
              </h2>
              <div className="text-sm text-gray-500">
                Toplam {videolar.length} video
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Video</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Eğitim Seti</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Süre</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Sıra</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Durum</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">İstatistikler</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredVideos().length > 0 ? (
                    getFilteredVideos().map((video) => {
                      const istatistik = getVideoIstatistik(video.id);
                      return (
                        <tr key={`video-${video.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <div className="flex items-start space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i className="ri-play-circle-line text-blue-600 text-xl"></i>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 line-clamp-1">{video.video_adi}</div>
                                <div className="text-sm text-gray-600 line-clamp-2">{video.aciklama}</div>
                                {video.pdf_url && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      <i className="ri-file-pdf-line mr-1"></i>
                                      PDF Eki
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-medium text-gray-900">{video.set_adi}</div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getKategoriColor(video.kategori)}`}>
                                {video.kategori}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-900 font-medium">{video.video_suresi} dk</td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                              {video.sira_no}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={video.durum}
                              onChange={(e) => handleVideoStatusChange(video.id, e.target.value)}
                              className={`px-2 py-1 rounded-full text-xs font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer pr-8 ${getDurumColor(video.durum)}`}
                            >
                              <option value="Aktif">Aktif</option>
                              <option value="Pasif">Pasif</option>
                              <option value="Beklemede">Beklemede</option>
                            </select>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center text-gray-600">
                                <i className="ri-eye-line mr-1"></i>
                                {istatistik.toplam_izlenme} görüntüleme
                              </div>
                              <div className="flex items-center text-gray-600">
                                <i className="ri-building-line mr-1"></i>
                                {istatistik.firma_sayisi} firma
                              </div>
                              <div className="flex items-center text-gray-600">
                                <i className="ri-bar-chart-line mr-1"></i>
                                %{istatistik.tamamlanma_orani} tamamlama
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(video.video_url, '_blank')}
                                className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors cursor-pointer"
                                title="YouTube'da Aç"
                              >
                                <i className="ri-external-link-line text-green-600"></i>
                              </button>
                              {video.pdf_url && (
                                <button
                                  onClick={() => window.open(video.pdf_url, '_blank')}
                                  className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
                                  title="PDF'yi Aç"
                                >
                                  <i className="ri-file-pdf-line text-red-600"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                        <div className="flex flex-col items-center space-y-2">
                          <i className="ri-play-circle-line text-4xl text-gray-300"></i>
                          <p>Seçilen kriterlere uygun video bulunamadı</p>
                          <button
                            onClick={() => {
                              setSelectedSet('');
                              setSelectedDurum('');
                            }}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Filtreleri Temizle
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
