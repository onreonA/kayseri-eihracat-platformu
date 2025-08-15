
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupabaseEgitimService } from '../../lib/database';
import { SupabaseFirmaService } from '../../lib/supabase-services';

interface EgitimSeti {
  id: number;
  set_adi: string;
  aciklama: string;
  kategori: string;
  durum: string;
  atanan_firmalar: number[];
  toplam_video_sayisi: number;
  toplam_sure: number;
  created_at: string;
  updated_at: string;
}

interface EgitimVideosu {
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
}

interface Firma {
  id: number;
  firma_adi: string;
  yetkili_email: string;
  durum: string;
}

export default function AdminEgitimYonetimiPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const [egitimSetleri, setEgitimSetleri] = useState<EgitimSeti[]>([]);
  const [setVideolari, setSetVideolari] = useState<{ [key: number]: EgitimVideosu[] }>({});
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [expandedSets, setExpandedSets] = useState<number[]>([]);

  const [selectedSet, setSelectedSet] = useState<EgitimSeti | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showAtamaModal, setShowAtamaModal] = useState(false);
  const [showEditSetModal, setShowEditSetModal] = useState(false);
  const [showEditVideoModal, setShowEditVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<EgitimVideosu | null>(null);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [setForm, setSetForm] = useState({
    setAdi: '',
    aciklama: '',
    kategori: '',
    durum: 'Aktif',
  });

  const [videoForm, setVideoForm] = useState({
    videoAdi: '',
    videoUrl: '',
    videoSuresi: 0,
    siraNo: 1,
    aciklama: '',
    pdfUrl: '',
  });

  const [selectedFirmalar, setSelectedFirmalar] = useState<number[]>([]);

  const router = useRouter();

  const menuItems = [
    {
      icon: 'ri-dashboard-line',
      label: 'Dashboard',
      href: '/admin-dashboard',
    },
    {
      icon: 'ri-building-line',
      label: 'Firma Yönetimi',
      href: '/admin-firmalar',
    },
    {
      icon: 'ri-project-line',
      label: 'Proje Yönetimi',
      href: '/admin-proje-yonetimi',
    },
    {
      icon: 'ri-calendar-check-line',
      label: 'Randevu Talepleri',
      href: '/admin-randevu-talepleri',
    },
    {
      icon: 'ri-graduation-cap-line',
      label: '📚 Eğitim Seti Yönetimi',
      href: '/admin-egitim-yonetimi',
      active: true,
      description: 'Setler ve videolar',
    },
    {
      icon: 'ri-play-circle-line',
      label: '🎥 Eğitim Videoları',
      href: '/admin-egitim-video-listesi',
      description: 'Tüm video listesi',
    },
    {
      icon: 'ri-bar-chart-box-line',
      label: '📊 Video İlerleme Raporu',
      href: '/admin-egitim-rapor-dashboard',
      description: 'İzlenme raporları',
    },
    {
      icon: 'ri-file-text-line',
      label: '📄 Dökümanlar',
      href: '/admin-destek-dokumanlari',
      description: 'PDF dökümanları',
    },
    {
      icon: 'ri-calendar-event-line',
      label: 'Etkinlik Yönetimi',
      href: '/admin-etkinlik-yonetimi',
    },
    {
      icon: 'ri-bar-chart-line',
      label: 'Dönem Yönetimi',
      href: '/admin-donem-yonetimi',
    },
    {
      icon: 'ri-discuss-line',
      label: 'Forum Yönetimi',
      href: '/admin-forum-yonetimi',
    },
    {
      icon: 'ri-feedback-line',
      label: 'Platform Geri Bildirimleri',
      href: '/admin-geri-bildirimler',
    },
    {
      icon: 'ri-team-line',
      label: 'Kullanıcılar (Personel)',
      href: '/admin-kullanici-yonetimi',
    },
    {
      icon: 'ri-check-double-line',
      label: 'Görev Onayları',
      href: '/admin-gorev-onaylari',
    },
  ];

  useEffect(() => {
    checkAdminAuth();
  }, [router]);

  const checkAdminAuth = async () => {
    try {
      // Önce localStorage kontrolü yap
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Eğitim Yönetimi):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Eğitim Yönetimi), veriler yükleniyor...');
        setIsAdminLoggedIn(true);
        setAdminEmail(localStorage.getItem('adminEmail') || '');
        loadAllData();
        return;
      }

      // Fallback: Supabase kontrolü
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.log('❌ Supabase bağlantısı yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ Supabase session yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      loadAllData();
    } catch (error) {
      console.error('[AdminEgitimYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        SupabaseEgitimService.getAllEgitimSetleri(),
        SupabaseFirmaService.getAllFirmalar(),
      ]);

      const setlerData = results[0].status === 'fulfilled' ? results[0].value : [];
      const firmalarData = results[1].status === 'fulfilled' ? results[1].value : [];

      setEgitimSetleri(setlerData || []);
      setFirmalar(firmalarData || []);
    } catch (error) {
      console.error('[AdminEgitimYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      setEgitimSetleri([]);
      setFirmalar([]);
      showMessage('Veri yüklenirken sorun oluştu, sistem çalışmaya devam ediyor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSetVideos = async (setId: number) => {
    try {
      console.log(`🎥 Set ${setId} videoları yükleniyor...`);
      const videolar = await SupabaseEgitimService.getEgitimVideolari(setId);
      setSetVideolari((prev) => ({ ...prev, [setId]: videolar || [] }));
      console.log(`🎥 ✅ Set ${setId}: ${videolar?.length || 0} video yüklendi`);
    } catch (error) {
      console.warn(`🎥 Set ${setId} video yükleme hatası:`, error);
      setSetVideolari((prev) => ({ ...prev, [setId]: [] }));
    }
  };

  const toggleSetExpand = async (setId: number) => {
    if (expandedSets.includes(setId)) {
      setExpandedSets((prev) => prev.filter((id) => id !== setId));
    } else {
      setExpandedSets((prev) => [...prev, setId]);
      if (!setVideolari[setId]) {
        await loadSetVideos(setId);
      }
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  };

  const resetSetForm = () => {
    setSetForm({ setAdi: '', aciklama: '', kategori: '', durum: 'Aktif' });
  };

  const resetVideoForm = () => {
    setVideoForm({ videoAdi: '', videoUrl: '', videoSuresi: 0, siraNo: 1, aciklama: '', pdfUrl: '' });
  };

  const handleCreateSet = async () => {
    try {
      if (!setForm.setAdi.trim()) {
        showMessage('Set adı boş bırakılamaz!', 'error');
        return;
      }

      if (!setForm.aciklama.trim()) {
        showMessage('Açıklama boş bırakılamaz!', 'error');
        return;
      }

      if (!setForm.kategori.trim()) {
        showMessage('Kategori seçilmelidir!', 'error');
        return;
      }

      console.log('📚 Eğitim seti oluşturuluyor...');

      const newSet = await SupabaseEgitimService.createEgitimSeti({
        setAdi: setForm.setAdi.trim(),
        aciklama: setForm.aciklama.trim(),
        kategori: setForm.kategori.trim(),
        durum: setForm.durum,
      });

      if (newSet) {
        const safeNewSet: EgitimSeti = {
          id: newSet.id || Date.now(),
          set_adi: newSet.set_adi || setForm.setAdi,
          aciklama: newSet.aciklama || setForm.aciklama,
          kategori: newSet.kategori || setForm.kategori,
          durum: newSet.durum || setForm.durum,
          atanan_firmalar: newSet.atanan_firmalar || [],
          toplam_video_sayisi: newSet.toplam_video_sayisi || 0,
          toplam_sure: newSet.toplam_sure || 0,
          created_at: newSet.created_at || new Date().toISOString(),
          updated_at: newSet.updated_at || new Date().toISOString(),
        };

        setEgitimSetleri((prev) => [safeNewSet, ...prev]);
        setShowSetModal(false);
        resetSetForm();
        showMessage('📚 ✅ Eğitim seti başarıyla oluşturuldu!');
      }
    } catch (error) {
      console.error('❌ Set oluşturma hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Eğitim seti oluşturulurken hata: ${errorMessage}`, 'error');
    }
  };

  const handleEditSet = (set: EgitimSeti) => {
    setSelectedSet(set);
    setSetForm({ setAdi: set.set_adi, aciklama: set.aciklama, kategori: set.kategori, durum: set.durum });
    setShowEditSetModal(true);
  };

  const handleUpdateSet = async () => {
    try {
      if (!selectedSet) return;

      if (!setForm.setAdi.trim()) {
        showMessage('Set adı boş bırakılamaz!', 'error');
        return;
      }
      if (!setForm.aciklama.trim()) {
        showMessage('Açıklama boş bırakılamaz!', 'error');
        return;
      }
      if (!setForm.kategori.trim()) {
        showMessage('Kategori seçilmelidir!', 'error');
        return;
      }

      console.log('📚 🎯 ÇÖZÜM: Eğitim seti güncelleniyor (GERÇEK VERİTABANI)...');

      const success = await SupabaseEgitimService.updateEgitimSeti(selectedSet.id, {
        setAdi: setForm.setAdi.trim(),
        aciklama: setForm.aciklama.trim(),
        kategori: setForm.kategori.trim(),
        durum: setForm.durum,
      });

      if (success) {
        const updatedSets = egitimSetleri.map((set) =>
          set.id === selectedSet.id
            ? {
                ...set,
                set_adi: setForm.setAdi.trim(),
                aciklama: setForm.aciklama.trim(),
                kategori: setForm.kategori.trim(),
                durum: setForm.durum,
                updated_at: new Date().toISOString(),
              }
            : set,
        );

        setEgitimSetleri(updatedSets);
        setShowEditSetModal(false);
        setSelectedSet(null);
        resetSetForm();
        showMessage('📚 ✅ Eğitim seti GERÇEK VERİTABANI\'nda başarıyla güncellendi!');
      }
    } catch (error) {
      console.error('❌ Set güncelleme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Eğitim seti güncellenirken hata: ${errorMessage}`, 'error');
    }
  };

  const handleDeleteSet = async (setId: number) => {
    try {
      if (confirm('Bu eğitim setini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve setteki tüm videolar da silinecektir.')) {
        console.log(`Set ${setId} silme işlemi başlatılıyor...`);

        const silindi = await SupabaseEgitimService.deleteEgitimSeti(setId);

        if (silindi) {
          setEgitimSetleri((prev) => prev.filter((set) => set.id !== setId));
          setSetVideolari((prev) => {
            const newState = { ...prev };
            delete newState[setId];
            return newState;
          });
          setExpandedSets((prev) => prev.filter((id) => id !== setId));

          showMessage('Eğitim seti ve tüm videoları KALICI OLARAK silindi!');
        }
      }
    } catch (error) {
      console.error('❌ Set silme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Eğitim seti silinirken hata oluştu: ${errorMessage}`, 'error');
    }
  };

  const handleCreateVideo = async () => {
    try {
      if (!selectedSet) {
        showMessage('Lütfen önce bir eğitim seti seçin!', 'error');
        return;
      }

      if (!videoForm.videoAdi.trim()) {
        showMessage('Video adı boş bırakılamaz!', 'error');
        return;
      }

      if (!videoForm.videoUrl.trim()) {
        showMessage('YouTube URL boş bırakılamaz!', 'error');
        return;
      }

      if (videoForm.videoSuresi <= 0) {
        showMessage('Video süresi 0\'dan büyük olmalıdır!', 'error');
        return;
      }

      console.log('🎥 Video ekleniyor...');

      const newVideo = await SupabaseEgitimService.createEgitimVideo({
        setId: selectedSet.id,
        baslik: videoForm.videoAdi.trim(),
        aciklama: videoForm.aciklama?.trim() || '',
        videoUrl: videoForm.videoUrl.trim(),
        siraNo: videoForm.siraNo,
      });

      if (newVideo) {
        await loadSetVideos(selectedSet.id);
        await loadAllData();

        setShowVideoModal(false);
        setSelectedSet(null);
        resetVideoForm();
        showMessage('🎥 ✅ Video başarıyla eklendi!');
      }
    } catch (error) {
      console.error('❌ Video ekleme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Video eklenirken hata: ${errorMessage}`, 'error');
    }
  };

  const handleEditVideo = (video: EgitimVideosu) => {
    setSelectedVideo(video);
    setVideoForm({
      videoAdi: video.video_adi,
      videoUrl: video.video_url,
      videoSuresi: video.video_suresi,
      siraNo: video.sira_no,
      aciklama: video.aciklama,
      pdfUrl: video.pdf_url || '',
    });
    setShowEditVideoModal(true);
  };

  const handleUpdateVideo = async () => {
    try {
      if (!selectedVideo) return;

      if (!videoForm.videoAdi.trim()) {
        showMessage('Video adı boş bırakılamaz!', 'error');
        return;
      }
      if (!videoForm.videoUrl.trim()) {
        showMessage('Video URL boş bırakılamaz!', 'error');
        return;
      }
      if (videoForm.videoSuresi <= 0) {
        showMessage('Video süresi 0\'dan büyük olmalıdır!', 'error');
        return;
      }

      console.log('🎥 🎯 ÇÖZÜM: Video güncelleniyor (GERÇEK VERİTABANI)...');

      const success = await SupabaseEgitimService.updateEgitimVideo(selectedVideo.id, {
        baslik: videoForm.videoAdi.trim(),
        videoUrl: videoForm.videoUrl.trim(),
        siraNo: videoForm.siraNo,
        aciklama: videoForm.aciklama.trim(),
      });

      if (success) {
        const setId = selectedVideo.egitim_set_id;
        const updatedVideos = (setVideolari[setId] || []).map((video) =>
          video.id === selectedVideo.id
            ? {
                ...video,
                video_adi: videoForm.videoAdi.trim(),
                video_url: videoForm.videoUrl.trim(),
                video_suresi: videoForm.videoSuresi,
                sira_no: videoForm.siraNo,
                aciklama: videoForm.aciklama.trim(),
                pdf_url: videoForm.pdfUrl.trim() || null,
              }
            : video,
        );

        setSetVideolari((prev) => ({ ...prev, [setId]: updatedVideos }));

        setEgitimSetleri((prev) =>
          prev.map((set) => {
            if (set.id === setId) {
              const toplamSure = updatedVideos.reduce((total, v) => total + v.video_suresi, 0);
              return {
                ...set,
                toplam_sure: toplamSure,
                updated_at: new Date().toISOString(),
              };
            }
            return set;
          }),
        );

        setShowEditVideoModal(false);
        setSelectedVideo(null);
        resetVideoForm();
        showMessage('🎥 ✅ Video GERÇEK VERİTABANI\'nda başarıyla güncellendi!');
      }
    } catch (error) {
      console.error('❌ Video güncelleme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Video güncellenirken hata: ${errorMessage}`, 'error');
    }
  };

  const handleDeleteVideo = async (video: EgitimVideosu) => {
    try {
      if (confirm('Bu videoyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        console.log(`Video ${video.id} silme işlemi başlatılıyor...`);

        const silindi = await SupabaseEgitimService.deleteEgitimVideosu(video.id);

        if (silindi) {
          const setId = video.egitim_set_id;

          const updatedVideos = (setVideolari[setId] || []).filter((v) => v.id !== video.id);
          setSetVideolari((prev) => ({ ...prev, [setId]: updatedVideos }));

          setEgitimSetleri((prev) =>
            prev.map((set) => {
              if (set.id === setId) {
                return {
                  ...set,
                  toplam_video_sayisi: updatedVideos.length,
                  toplam_sure: updatedVideos.reduce((total, v) => total + v.video_suresi, 0),
                  updated_at: new Date().toISOString(),
                };
              }
              return set;
            }),
          );

          showMessage('Video KALICI OLARAK silindi!');
        }
      }
    } catch (error) {
      console.error('❌ Video silme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Video silinirken hata oluştu: ${errorMessage}`, 'error');
    }
  };

  const handleAssignToFirmalar = async () => {
    try {
      if (!selectedSet) {
        showMessage('Lütfen bir eğitim seti seçin!', 'error');
        return;
      }

      if (selectedFirmalar.length === 0) {
        showMessage('Lütfen en az bir firma seçin!', 'error');
        return;
      }

      console.log('Firma ataması yapılıyor...');

      const success = await SupabaseEgitimService.ataEgitimSetiFirmaya(selectedSet.id, selectedFirmalar);

      if (success) {
        await loadAllData();
        setShowAtamaModal(false);
        setSelectedFirmalar([]);
        setSelectedSet(null);
        showMessage(`Eğitim seti ${selectedFirmalar.length} firmaya başarıyla atandı!`);
      }
    } catch (error) {
      console.error('Atama hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Atama işlemi sırasında hata: ${errorMessage}`, 'error');
    }
  };

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Temel Eğitim':
        return 'bg-blue-500';
      case 'İleri Eğitim':
        return 'bg-purple-500';
      case 'Pazarlama':
        return 'bg-green-500';
      case 'Gümrük':
        return 'bg-yellow-500';
      case 'Platform':
        return 'bg-indigo-500';
      case 'Finans':
        return 'bg-red-500';
      case 'Lojistik':
        return 'bg-orange-500';
      case 'Güvenlik':
        return 'bg-gray-500';
      case 'Müşteri Hizmetleri':
        return 'bg-pink-500';
      case 'Teknik':
        return 'bg-teal-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push('/admin-login');
    } catch (error) {
      console.error('[AdminEgitimYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/admin-login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">📚 Entegre eğitim seti yönetimi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col fixed left-0 top-0 h-full z-50`}
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <Link href="/admin-dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="ri-shield-star-line text-white"></i>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold text-white font-[`Pacifico`]">logo</h1>
                  <p className="text-xs text-slate-300">Yönetim Paneli</p>
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
                <p className="text-xs text-slate-300 truncate">Yönetici</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 flex-1 flex flex-col`}
      >
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📚 Eğitim Seti Yönetimi</h1>
              <p className="text-gray-600 mt-1">Eğitim setlerini, videoları yönetin ve firmalara atayın</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin-egitim-video-listesi"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-list-check"></i>
                <span>Video Listesi</span>
              </Link>
              <Link
                href="/admin-egitim-rapor-dashboard"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-bar-chart-box-line"></i>
                <span>Rapor Paneli</span>
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
            <div
              className={`mb-6 p-4 rounded-lg border ${
                message.includes('başarıyla') || message.includes('✅')
                  ? 'bg-green-50 border-green-200 text-green-600'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Action Area */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Eğitim Setleri</h2>
              <p className="text-gray-600">Setleri genişleterek içerideki videoları görün ve yönetin</p>
            </div>
            <button
              onClick={() => setShowSetModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
            >
              <i className="ri-add-line"></i>
              <span>Yeni Eğitim Seti</span>
            </button>
          </div>

          {egitimSetleri.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-graduation-cap-line text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz eğitim seti yok</h3>
              <p className="text-gray-600 mb-6">İlk eğitim setinizi oluşturarak başlayın</p>
              <button
                onClick={() => setShowSetModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
              >
                Eğitim Seti Oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {egitimSetleri.map((set) => (
                <div key={set.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Set Header - Expandable */}
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => toggleSetExpand(set.id)}
                          className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <i
                            className={`ri-arrow-${expandedSets.includes(set.id) ? 'down' : 'right'}-s-line text-gray-600`}
                          ></i>
                        </button>

                        <div className={`w-4 h-4 rounded-full ${getKategoriColor(set.kategori)}`}></div>

                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">{set.set_adi}</h3>
                          <p className="text-gray-600 text-sm mt-1">{set.aciklama}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <i className="ri-price-tag-3-line"></i>
                              <span>{set.kategori}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="ri-play-circle-line"></i>
                              <span>{set.toplam_video_sayisi} video</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="ri-time-line"></i>
                              <span>{set.toplam_sure} dakika</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="ri-building-line"></i>
                              <span>{set.atanan_firmalar?.length || 0} firma</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              set.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {set.durum}
                          </span>
                        </div>
                      </div>

                      {/* Set Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedSet(set);
                            const videos = setVideolari[set.id] || [];
                            setVideoForm({ ...videoForm, siraNo: videos.length + 1 });
                            setShowVideoModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium cursor-pointer flex items-center space-x-1"
                        >
                          <i className="ri-add-line"></i>
                          <span>Video Ekle</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedSet(set);
                            setShowAtamaModal(true);
                          }}
                          className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium cursor-pointer flex items-center space-x-1"
                        >
                          <i className="ri-building-line"></i>
                          <span>Firmaya Ata</span>
                        </button>

                        <button
                          onClick={() => handleEditSet(set)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <i className="ri-edit-line text-gray-600"></i>
                        </button>

                        <button
                          onClick={() => handleDeleteSet(set.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-red-600"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Video List */}
                  {expandedSets.includes(set.id) && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">📹 Set Videoları</h4>
                          <button
                            onClick={() => {
                              setSelectedSet(set);
                              const videos = setVideolari[set.id] || [];
                              setVideoForm({ ...videoForm, siraNo: videos.length + 1 });
                              setShowVideoModal(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer flex items-center space-x-1"
                          >
                            <i className="ri-add-line"></i>
                            <span>Video Ekle</span>
                          </button>
                        </div>

                        {/* Video List */}
                        {setVideolari[set.id]?.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <i className="ri-play-circle-line text-3xl mb-2"></i>
                            <p>Bu sete henüz video eklenmemiş</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {(setVideolari[set.id] || []).map((video) => (
                              <div
                                key={video.id}
                                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <span className="text-blue-600 text-sm font-medium">{video.sira_no}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 text-sm truncate">{video.video_adi}</h5>
                                      <p className="text-xs text-gray-500 mt-1">{video.video_suresi} dakika</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1 ml-2">
                                    <button
                                      onClick={() => window.open(video.video_url, '_blank')}
                                      className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors cursor-pointer"
                                      title="YouTube'da Aç"
                                    >
                                      <i className="ri-external-link-line text-green-600 text-xs"></i>
                                    </button>
                                    <button
                                      onClick={() => handleEditVideo(video)}
                                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Düzenle"
                                    >
                                      <i className="ri-edit-line text-gray-600 text-xs"></i>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVideo(video)}
                                      className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Sil"
                                    >
                                      <i className="ri-delete-bin-line text-red-600 text-xs"></i>
                                    </button>
                                  </div>
                                </div>

                                {video.aciklama && (
                                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{video.aciklama}</p>
                                )}

                                {video.pdf_url && (
                                  <div className="flex items-center text-xs text-red-600 mt-2">
                                    <i className="ri-file-pdf-line mr-1"></i>
                                    <span>PDF eki mevcut</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Modals */}
          {showSetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">📚 Yeni Eğitim Seti</h3>
                    <button
                      onClick={() => setShowSetModal(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Set Adı *</label>
                      <input
                        type="text"
                        value={setForm.setAdi}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, setAdi: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama *</label>
                      <textarea
                        value={setForm.aciklama}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, aciklama: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        maxLength={500}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                      <select
                        value={setForm.kategori}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, kategori: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                        required
                      >
                        <option value="">Kategori Seçin</option>
                        <option value="Temel Eğitim">📚 Temel Eğitim</option>
                        <option value="İleri Eğitim">🎓 İleri Eğitim</option>
                        <option value="Pazarlama">📈 Pazarlama</option>
                        <option value="Gümrük">🛃 Gümrük</option>
                        <option value="Platform">💻 Platform</option>
                        <option value="Finans">💰 Finans</option>
                        <option value="Lojistik">🚚 Lojistik</option>
                        <option value="Güvenlik">🔒 Güvenlik</option>
                        <option value="Müşteri Hizmetleri">🎧 Müşteri Hizmetleri</option>
                        <option value="Teknik">⚙️ Teknik</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                      <select
                        value={setForm.durum}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, durum: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="Aktif">✅ Aktif</option>
                        <option value="Pasif">❌ Pasif</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowSetModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleCreateSet}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                    >
                      Oluştur
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Modal */}
          {showVideoModal && selectedSet && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">🎥 Video Ekle</h3>
                    <button
                      onClick={() => {
                        setShowVideoModal(false);
                        setSelectedSet(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedSet.set_adi}</strong> setine video ekliyorsunuz
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video Adı *</label>
                      <input
                        type="text"
                        value={videoForm.videoAdi}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, videoAdi: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL *</label>
                      <input
                        type="url"
                        value={videoForm.videoUrl}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, videoUrl: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika) *</label>
                        <input
                          type="number"
                          value={videoForm.videoSuresi}
                          onChange={(e) =>
                            setVideoForm((prev) => ({
                              ...prev,
                              videoSuresi: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sıra No *</label>
                        <input
                          type="number"
                          value={videoForm.siraNo}
                          onChange={(e) =>
                            setVideoForm((prev) => ({
                              ...prev,
                              siraNo: parseInt(e.target.value) || 1,
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                      <textarea
                        value={videoForm.aciklama}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, aciklama: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        maxLength={500}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (Opsiyonel)</label>
                      <input
                        type="url"
                        value={videoForm.pdfUrl}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, pdfUrl: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="PDF dosyası bağlantısı"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowVideoModal(false);
                        setSelectedSet(null);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleCreateVideo}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                    >
                      Video Ekle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Firm Assignment Modal */}
          {showAtamaModal && selectedSet && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">🏢 Firmaya Ata</h3>
                    <button
                      onClick={() => {
                        setShowAtamaModal(false);
                        setSelectedSet(null);
                        setSelectedFirmalar([]);
                      }}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>{selectedSet.set_adi}</strong> setini firmalara atayın
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Firmalar ({selectedFirmalar.length} seçili)
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {firmalar.map((firma) => {
                        const isAlreadyAssigned = selectedSet.atanan_firmalar?.includes(firma.id);
                        const isSelected = selectedFirmalar.includes(firma.id);

                        return (
                          <div
                            key={firma.id}
                            className={`p-3 border-b border-gray-100 flex items-center justify-between ${
                              isAlreadyAssigned ? 'bg-gray-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAlreadyAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFirmalar((prev) => [...prev, firma.id]);
                                  } else {
                                    setSelectedFirmalar((prev) => prev.filter((id) => id !== firma.id));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{firma.firma_adi}</p>
                                <p className="text-sm text-gray-500">{firma.yetkili_email}</p>
                              </div>
                            </div>

                            {isAlreadyAssigned && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Zaten atanmış
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAtamaModal(false);
                        setSelectedSet(null);
                        setSelectedFirmalar([]);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleAssignToFirmalar}
                      disabled={selectedFirmalar.length === 0}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Ata ({selectedFirmalar.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Set Modal */}
          {showEditSetModal && selectedSet && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">✏️ Eğitim Setini Düzenle</h3>
                    <button
                      onClick={() => {
                        setShowEditSetModal(false);
                        setSelectedSet(null);
                        resetSetForm();
                      }}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Set Adı *</label>
                      <input
                        type="text"
                        value={setForm.setAdi}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, setAdi: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama *</label>
                      <textarea
                        value={setForm.aciklama}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, aciklama: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        maxLength={500}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                      <select
                        value={setForm.kategori}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, kategori: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                        required
                      >
                        <option value="">Kategori Seçin</option>
                        <option value="Temel Eğitim">📚 Temel Eğitim</option>
                        <option value="İleri Eğitim">🎓 İleri Eğitim</option>
                        <option value="Pazarlama">📈 Pazarlama</option>
                        <option value="Gümrük">🛃 Gümrük</option>
                        <option value="Platform">💻 Platform</option>
                        <option value="Finans">💰 Finans</option>
                        <option value="Lojistik">🚚 Lojistik</option>
                        <option value="Güvenlik">🔒 Güvenlik</option>
                        <option value="Müşteri Hizmetleri">🎧 Müşteri Hizmetleri</option>
                        <option value="Teknik">⚙️ Teknik</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                      <select
                        value={setForm.durum}
                        onChange={(e) =>
                          setSetForm((prev) => ({ ...prev, durum: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="Aktif">✅ Aktif</option>
                        <option value="Pasif">❌ Pasif</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowEditSetModal(false);
                        setSelectedSet(null);
                        resetSetForm();
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleUpdateSet}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                    >
                      Güncelle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Video Modal */}
          {showEditVideoModal && selectedVideo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">✏️ Videoyu Düzenle</h3>
                    <button
                      onClick={() => {
                        setShowEditVideoModal(false);
                        setSelectedVideo(null);
                        resetVideoForm();
                      }}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video Adı *</label>
                      <input
                        type="text"
                        value={videoForm.videoAdi}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, videoAdi: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL *</label>
                      <input
                        type="url"
                        value={videoForm.videoUrl}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, videoUrl: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika) *</label>
                        <input
                          type="number"
                          value={videoForm.videoSuresi}
                          onChange={(e) =>
                            setVideoForm((prev) => ({
                              ...prev,
                              videoSuresi: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sıra No *</label>
                        <input
                          type="number"
                          value={videoForm.siraNo}
                          onChange={(e) =>
                            setVideoForm((prev) => ({
                              ...prev,
                              siraNo: parseInt(e.target.value) || 1,
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                      <textarea
                        value={videoForm.aciklama}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, aciklama: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        maxLength={500}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL</label>
                      <input
                        type="url"
                        value={videoForm.pdfUrl}
                        onChange={(e) =>
                          setVideoForm((prev) => ({ ...prev, pdfUrl: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="PDF dosyası bağlantısı"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowEditVideoModal(false);
                        setSelectedVideo(null);
                        resetVideoForm();
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleUpdateVideo}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                    >
                      Güncelle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
