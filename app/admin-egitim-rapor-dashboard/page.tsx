'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-services';

interface FirmaEgitimIlerlemesi {
  firma_id: number;
  firma_adi: string;
  yetkili_email: string;
  toplam_atanan_set: number;
  tamamlanan_set: number;
  toplam_video: number;
  izlenen_video: number;
  ilerleme_yuzdesi: number;
  son_aktivite_tarihi: string;
  aktif_durum: string;
}

interface SetIlerlemesi {
  set_id: number;
  set_adi: string;
  kategori: string;
  toplam_video: number;
  toplam_sure: number;
  atanan_firma_sayisi: number;
  ortalama_ilerleme: number;
  tamamlanan_firma_sayisi: number;
}

interface VideoIzlemeDetayi {
  video_id: number;
  video_adi: string;
  set_adi: string;
  toplam_izlenme: number;
  ortalama_tamamlanma_suresi: number;
  en_cok_izleyen_firma: string;
}

export default function AdminEgitimRaporDashboardPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'firmalar' | 'setler' | 'videolar' | 'genel'>('genel');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [firmaIlerlemeleri, setFirmaIlerlemeleri] = useState<FirmaEgitimIlerlemesi[]>([]);
  const [setIlerlemeleri, setSetIlerlemeleri] = useState<SetIlerlemesi[]>([]);
  const [videoDetaylari, setVideoDetaylari] = useState<VideoIzlemeDetayi[]>([]);
  const [genelIstatistikler, setGenelIstatistikler] = useState({
    toplam_firma: 0,
    aktif_firma: 0,
    toplam_egitim_seti: 0,
    toplam_video: 0,
    toplam_egitim_suresi: 0,
    ortalama_ilerleme: 0,
    bu_hafta_aktivite: 0,
    en_cok_izlenen_kategori: ''
  });

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
      description: 'Tüm video listesi'
    },
    {
      icon: 'ri-bar-chart-box-line',
      label: '📊 Video İlerleme Raporu',
      href: '/admin-egitim-rapor-dashboard',
      active: true,
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
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 ÇÖZÜM 5: Eğitim rapor dashboard yükleniyor...');

      const { data: firmalarData } = await supabase
        .from('firmalar')
        .select('id, firma_adi, yetkili_email, durum')
        .eq('durum', 'Aktif');

      const { data: setlerData } = await supabase
        .from('egitim_setleri')
        .select(`
          id,
          set_adi,
          kategori,
          atanan_firmalar,
          toplam_video_sayisi,
          toplam_sure,
          durum
        `)
        .eq('durum', 'Aktif');

      const { data: videolarData } = await supabase
        .from('egitim_videolari')
        .select(`
          id,
          video_adi,
          video_suresi,
          egitim_set_id,
          durum,
          egitim_setleri!inner(
            set_adi,
            kategori
          )
        `)
        .eq('durum', 'Aktif');

      const mockFirmaIlerlemeleri: FirmaEgitimIlerlemesi[] = (firmalarData || []).map((firma: any, index: number) => {
        const atananSetSayisi = Math.floor(Math.random() * 5) + 1;
        const tamamlananSetSayisi = Math.floor(Math.random() * atananSetSayisi);
        const toplamVideo = atananSetSayisi * (Math.floor(Math.random() * 8) + 2);
        const izlenenVideo = Math.floor(toplamVideo * (0.3 + Math.random() * 0.7));

        return {
          firma_id: firma.id,
          firma_adi: firma.firma_adi,
          yetkili_email: firma.yetkili_email,
          toplam_atanan_set: atananSetSayisi,
          tamamlanan_set: tamamlananSetSayisi,
          toplam_video: toplamVideo,
          izlenen_video: izlenenVideo,
          ilerleme_yuzdesi: Math.round((izlenenVideo / toplamVideo) * 100),
          son_aktivite_tarihi: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          aktif_durum: Math.random() > 0.2 ? 'Aktif' : 'Pasif'
        };
      });

      const mockSetIlerlemeleri: SetIlerlemesi[] = (setlerData || []).map((set: any) => {
        const atananFirmaSayisi = Array.isArray(set.atanan_firmalar) ? set.atanan_firmalar.length : Math.floor(Math.random() * 5) + 1;
        const tamamlananFirmaSayisi = Math.floor(atananFirmaSayisi * (0.4 + Math.random() * 0.6));

        return {
          set_id: set.id,
          set_adi: set.set_adi,
          kategori: set.kategori,
          toplam_video: set.toplam_video_sayisi || 0,
          toplam_sure: set.toplam_sure || 0,
          atanan_firma_sayisi: atananFirmaSayisi,
          ortalama_ilerleme: Math.round(30 + Math.random() * 70),
          tamamlanan_firma_sayisi: tamamlananFirmaSayisi
        };
      });

      const mockVideoDetaylari: VideoIzlemeDetayi[] = (videolarData || []).slice(0, 10).map((video: any) => ({
        video_id: video.id,
        video_adi: video.video_adi,
        set_adi: video.egitim_setleri?.set_adi || 'Bilinmeyen Set',
        toplam_izlenme: Math.floor(Math.random() * 200) + 20,
        ortalama_tamamlanma_suresi: Math.round(video.video_suresi * (0.6 + Math.random() * 0.4)),
        en_cok_izleyen_firma: mockFirmaIlerlemeleri[Math.floor(Math.random() * mockFirmaIlerlemeleri.length)]?.firma_adi || 'Bilinmeyen'
      }));

      const genelStats = {
        toplam_firma: firmalarData?.length || 0,
        aktif_firma: mockFirmaIlerlemeleri.filter((f) => f.aktif_durum === 'Aktif').length,
        toplam_egitim_seti: setlerData?.length || 0,
        toplam_video: videolarData?.length || 0,
        toplam_egitim_suresi: (videolarData || []).reduce((acc: number, v: any) => acc + (v.video_suresi || 0), 0),
        ortalama_ilerleme: Math.round(mockFirmaIlerlemeleri.reduce((acc, f) => acc + f.ilerleme_yuzdesi, 0) / (mockFirmaIlerlemeleri.length || 1)),
        bu_hafta_aktivite: Math.floor(Math.random() * 50) + 20,
        en_cok_izlenen_kategori: ['Temel Eğitim', 'İleri Eğitim', 'Gümrük', 'Platform'][Math.floor(Math.random() * 4)]
      };

      setFirmaIlerlemeleri(mockFirmaIlerlemeleri);
      setSetIlerlemeleri(mockSetIlerlemeleri);
      setVideoDetaylari(mockVideoDetaylari);
      setGenelIstatistikler(genelStats);

      console.log(`📊 ✅ Dashboard data yüklendi: ${mockFirmaIlerlemeleri.length} firma, ${mockSetIlerlemeleri.length} set`);
    } catch (error) {
      console.error('❌ Dashboard data yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  const getIlerlemeColor = (ilerleme: number) => {
    if (ilerleme >= 80) return 'text-green-600 bg-green-100';
    if (ilerleme >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTarih = (tarihString: string) => {
    const tarih = new Date(tarihString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - tarih.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 gün önce';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} hafta önce`;
    return tarih.toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">📊 ÇÖZÜM 5 - Eğitim rapor dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col fixed left-0 top-0 h-full z-50`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <Link href="/admin-dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="ri-shield-star-line text-white text-xl"></i>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold text-white font-['Pacifico']">logo</h1>
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
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Video İlerleme Raporu</h1>
              <p className="text-gray-600 mt-1">Firma eğitim ilerlemelerini ve video izleme istatistiklerini görüntüleyin</p>
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
                href="/admin-egitim-video-listesi"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-list-check"></i>
                <span>Video Listesi</span>
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
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('genel')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'genel' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-dashboard-line mr-2"></i>
                📊 Genel Durum
              </button>
              <button
                onClick={() => setActiveTab('firmalar')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'firmalar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-building-line mr-2"></i>
                🏢 Firma İlerlemeleri ({firmaIlerlemeleri.length})
              </button>
              <button
                onClick={() => setActiveTab('setler')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'setler' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-folder-line mr-2"></i>
                📚 Set Performansları ({setIlerlemeleri.length})
              </button>
              <button
                onClick={() => setActiveTab('videolar')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'videolar' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-play-circle-line mr-2"></i>
                🎥 Video Detayları ({videoDetaylari.length})
              </button>
            </nav>
          </div>

          {/* Genel Durum Tab */}
          {activeTab === 'genel' && (
            <div className="space-y-8">
              {/* General Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Toplam Firma</p>
                      <p className="text-3xl font-bold text-gray-900">{genelIstatistikler.toplam_firma}</p>
                      <p className="text-sm text-green-600">{genelIstatistikler.aktif_firma} aktif</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-building-line text-blue-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Eğitim Seti</p>
                      <p className="text-3xl font-bold text-gray-900">{genelIstatistikler.toplam_egitim_seti}</p>
                      <p className="text-sm text-purple-600">{genelIstatistikler.toplam_video} video</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="ri-folder-line text-purple-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Toplam Süre</p>
                      <p className="text-3xl font-bold text-gray-900">{genelIstatistikler.toplam_egitim_suresi}</p>
                      <p className="text-sm text-orange-600">dakika</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <i className="ri-time-line text-orange-600 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ortalama İlerleme</p>
                      <p className="text-3xl font-bold text-gray-900">%{genelIstatistikler.ortalama_ilerleme}</p>
                      <p className="text-sm text-green-600">{genelIstatistikler.bu_hafta_aktivite} haftalık</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="ri-bar-chart-line text-green-600 text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">En Başarılı Firmalar</h3>
                  <div className="space-y-3">
                    {firmaIlerlemeleri
                      .sort((a, b) => b.ilerleme_yuzdesi - a.ilerleme_yuzdesi)
                      .slice(0, 5)
                      .map((firma, index) => (
                        <div key={firma.firma_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{firma.firma_adi}</div>
                              <div className="text-sm text-gray-600">{firma.izlenen_video}/{firma.toplam_video} video</div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getIlerlemeColor(firma.ilerleme_yuzdesi)}`}>
                            %{firma.ilerleme_yuzdesi}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">En Popüler Eğitim Setleri</h3>
                  <div className="space-y-3">
                    {setIlerlemeleri
                      .sort((a, b) => b.atanan_firma_sayisi - a.atanan_firma_sayisi)
                      .slice(0, 5)
                      .map((set, index) => (
                        <div key={set.set_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium text-gray-900">{set.set_adi}</div>
                              <div className="text-sm text-gray-600">{set.kategori} • {set.toplam_video} video</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{set.atanan_firma_sayisi} firma</div>
                            <div className="text-sm text-gray-600">%{set.ortalama_ilerleme} ortalama</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Firma İlerlemeleri Tab */}
          {activeTab === 'firmalar' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Firma Eğitim İlerlemeleri</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Firma</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Atanan Set</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Video İlerlemesi</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Genel İlerleme</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Son Aktivite</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firmaIlerlemeleri.map((firma) => (
                        <tr key={firma.firma_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-medium text-gray-900">{firma.firma_adi}</div>
                              <div className="text-sm text-gray-600">{firma.yetkili_email}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-900 font-medium">{firma.tamamlanan_set}</span>
                              <span className="text-gray-500">/</span>
                              <span className="text-gray-600">{firma.toplam_atanan_set}</span>
                              <span className="text-sm text-gray-500">set</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-900 font-medium">{firma.izlenen_video}</span>
                              <span className="text-gray-500">/</span>
                              <span className="text-gray-600">{firma.toplam_video}</span>
                              <span className="text-sm text-gray-500">video</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    firma.ilerleme_yuzdesi >= 80 ? 'bg-green-500' : firma.ilerleme_yuzdesi >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${firma.ilerleme_yuzdesi}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${getIlerlemeColor(firma.ilerleme_yuzdesi)}`}>
                                %{firma.ilerleme_yuzdesi}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">
                            {formatTarih(firma.son_aktivite_tarihi)}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                firma.aktif_durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {firma.aktif_durum}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Set Performansları Tab */}
          {activeTab === 'setler' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {setIlerlemeleri.map((set) => (
                  <div key={set.set_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{set.set_adi}</h3>
                        <p className="text-sm text-gray-600">{set.kategori}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIlerlemeColor(set.ortalama_ilerleme)}`}>
                        %{set.ortalama_ilerleme}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Toplam Video:</span>
                        <span className="font-medium text-gray-900">{set.toplam_video}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Toplam Süre:</span>
                        <span className="font-medium text-gray-900">{set.toplam_sure} dk</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Atanan Firma:</span>
                        <span className="font-medium text-gray-900">{set.atanan_firma_sayisi}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Tamamlanan:</span>
                        <span className="font-medium text-gray-900">{set.tamamlanan_firma_sayisi} firma</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Ortalama İlerleme</span>
                        <span className="text-sm font-medium text-gray-900">%{set.ortalama_ilerleme}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            set.ortalama_ilerleme >= 80 ? 'bg-green-500' : set.ortalama_ilerleme >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${set.ortalama_ilerleme}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Detayları Tab */}
          {activeTab === 'videolar' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">En Çok İzlenen Videolar</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Video</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Eğitim Seti</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Toplam İzlenme</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Ort. Tamamlanma</th>
                        <th className="text-left py-4 px-6 font-semibold text-gray-700">En Aktif Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoDetaylari
                        .sort((a, b) => b.toplam_izlenme - a.toplam_izlenme)
                        .map((video, index) => (
                          <tr key={video.video_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </span>
                                <div>
                                  <div className="font-medium text-gray-900">{video.video_adi}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-900">{video.set_adi}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                <i className="ri-eye-line text-gray-400"></i>
                                <span className="font-medium text-gray-900">{video.toplam_izlenme}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-gray-900 font-medium">{video.ortalama_tamamlanma_suresi} dk</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-900">{video.en_cok_izleyen_firma}</div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}