
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/Toast';

interface Haber {
  id: number;
  baslik: string;
  kisa_aciklama?: string;
  detayli_icerik?: string;
  gorsel_url?: string;
  video_url?: string;
  yayin_tarihi: string;
  olusturma_tarihi: string;
  durum: 'taslak' | 'yayinda' | 'arsiv';
  haber_turu: 'duyuru' | 'haber' | 'danisan_notu';
  etiketler: string[];
  okunma_sayisi?: number;
}

interface HaberEtiketi {
  id: number;
  etiket_adi: string;
  renk_kodu: string;
  kullanim_sayisi: number;
}

interface HaberStats {
  toplam: number;
  yayinda: number;
  taslak: number;
  bu_ay: number;
}

// Sidebar component
const AdminSidebar = ({ activeMenuItem, setActiveMenuItem }: { activeMenuItem: string; setActiveMenuItem: (item: string) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'ri-dashboard-line', active: false, href: '/admin-dashboard' },
    { name: 'Firmalar', icon: 'ri-building-line', active: false, href: '/admin-firmalar' },
    { name: 'Proje Yönetimi', icon: 'ri-project-line', active: false, href: '/admin-proje-yonetimi' },
    { name: 'Haberler', icon: 'ri-newspaper-line', active: true },
    { name: 'Eğitim Yönetimi', icon: 'ri-graduation-cap-line', active: false, href: '/admin-egitim-yonetimi' },
    { name: 'Etkinlik Yönetimi', icon: 'ri-calendar-event-line', active: false, href: '/admin-etkinlik-yonetimi' },
    { name: 'Destek Dokümanları', icon: 'ri-file-text-line', active: false, href: '/admin-destek-dokumanlari' },
    { name: 'Randevu Talepleri', icon: 'ri-calendar-check-line', active: false, href: '/admin-randevu-talepleri' },
    { name: 'Forum Yönetimi', icon: 'ri-discuss-line', active: false, href: '/admin-forum-yonetimi' },
    { name: 'Raporlar', icon: 'ri-bar-chart-line', active: false, href: '/admin-donem-yonetimi' },
    { name: 'Kullanıcılar', icon: 'ri-team-line', active: false, href: '/admin-kullanici-yonetimi' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            item.href ? (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  item.active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            ) : (
              <button
                key={item.name}
                onClick={() => setActiveMenuItem(item.name)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  item.active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          ))}
        </nav>
      </div>
    </div>
  );
};

export default function AdminHaberlerPage() {
  const [haberler, setHaberler] = useState<Haber[]>([]);
  const [etiketler, setEtiketler] = useState<HaberEtiketi[]>([]);
  const [stats, setStats] = useState<HaberStats>({ toplam: 0, yayinda: 0, taslak: 0, bu_ay: 0 });
  const [selectedDurum, setSelectedDurum] = useState<string>('Tümü');
  const [selectedTur, setSelectedTur] = useState<string>('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showYeniHaberForm, setShowYeniHaberForm] = useState(false);
  const [editingHaber, setEditingHaber] = useState<Haber | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form state
  const [haberForm, setHaberForm] = useState({
    baslik: '',
    kisa_aciklama: '',
    detayli_icerik: '',
    gorsel_url: '',
    video_url: '',
    yayin_tarihi: new Date().toISOString().slice(0, 16),
    durum: 'taslak' as 'taslak' | 'yayinda' | 'arsiv',
    haber_turu: 'haber' as 'duyuru' | 'haber' | 'danisan_notu',
    etiketler: [] as string[]
  });

  const { addToast, ToastContainer } = useToast();
  const router = useRouter();
  const isMountedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    checkAdminAuth();
  }, [mounted, router]);

  const checkAdminAuth = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        router.replace('/admin-login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin-login');
        return;
      }

      loadData();
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Haberleri yükle
      await loadHaberler();

      // Etiketleri yükle
      await loadEtiketler();

      // İstatistikleri hesapla
      await calculateStats();
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      addToast({ message: 'Veriler yüklenirken hata oluştu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadHaberler = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('haberler')
        .select(`
          *,
          haber_istatistikleri (
            toplam_okuma
          )
        `)
        .order('olusturma_tarihi', { ascending: false });

      if (error) throw error;

      const haberlerWithStats = data?.map((haber: any) => ({ ...haber, okunma_sayisi: haber.haber_istatistikleri?.[0]?.toplam_okuma || 0 })) || [];

      setHaberler(haberlerWithStats);
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      throw error;
    }
  };

  const loadEtiketler = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('haber_etiketleri')
        .select('*')
        .order('kullanim_sayisi', { ascending: false });

      if (error) throw error;

      setEtiketler(data || []);
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      throw error;
    }
  };

  const calculateStats = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('haberler')
        .select('durum, olusturma_tarihi');

      if (error) throw error;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const newStats = {
        toplam: data?.length || 0,
        yayinda: data?.filter((h: any) => h.durum === 'yayinda').length || 0,
        taslak: data?.filter((h: any) => h.durum === 'taslak').length || 0,
        bu_ay: data?.filter((h: any) => new Date(h.olusturma_tarihi) >= thisMonth).length || 0
      };

      setStats(newStats);
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
    }
  };

  const handleHaberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!haberForm.baslik.trim()) {
      addToast({ message: 'Haber başlığı gerekli', type: 'error' });
      return;
    }

    try {
      const haberData = {
        ...haberForm,
        yayin_tarihi: new Date(haberForm.yayin_tarihi).toISOString(),
        guncelleme_tarihi: new Date().toISOString()
      };

      if (editingHaber) {
        // Güncelleme
        const { error } = await getSupabaseClient()
          .from('haberler')
          .update(haberData)
          .eq('id', editingHaber.id);

        if (error) throw error;

        addToast({ message: 'Haber başarıyla güncellendi', type: 'success' });
      } else {
        // Yeni haber
        const { data, error } = await getSupabaseClient()
          .from('haberler')
          .insert([haberData])
          .select();

        if (error) throw error;

        // İstatistik kaydı oluştur
        if (data?.[0]) {
          await getSupabaseClient()
            .from('haber_istatistikleri')
            .insert([{ haber_id: data[0].id }]);
        }

        addToast({ message: 'Haber başarıyla oluşturuldu', type: 'success' });
      }

      // Form sıfırla ve listeyi yenile
      setHaberForm({
        baslik: '',
        kisa_aciklama: '',
        detayli_icerik: '',
        gorsel_url: '',
        video_url: '',
        yayin_tarihi: new Date().toISOString().slice(0, 16),
        durum: 'taslak',
        haber_turu: 'haber',
        etiketler: []
      });
      setShowYeniHaberForm(false);
      setEditingHaber(null);
      await loadData();
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      addToast({ message: 'Haber kaydedilirken hata oluştu', type: 'error' });
    }
  };

  const handleHaberDelete = async (haberId: number) => {
    if (!confirm('Bu haberi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await getSupabaseClient()
        .from('haberler')
        .delete()
        .eq('id', haberId);

      if (error) throw error;

      addToast({ message: 'Haber başarıyla silindi', type: 'success' });
      await loadData();
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      addToast({ message: 'Haber silinirken hata oluştu', type: 'error' });
    }
  };

  const handleStatusChange = async (haberId: number, yeniDurum: 'taslak' | 'yayinda' | 'arsiv') => {
    try {
      const { error } = await getSupabaseClient()
        .from('haberler')
        .update({ 
          durum: yeniDurum,
          guncelleme_tarihi: new Date().toISOString()
        })
        .eq('id', haberId);

      if (error) throw error;

      addToast({ message: 'Haber durumu güncellendi', type: 'success' });
      await loadData();
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      addToast({ message: 'Durum güncellenirken hata oluştu', type: 'error' });
    }
  };

  const startEdit = (haber: Haber) => {
    setEditingHaber(haber);
    setHaberForm({
      baslik: haber.baslik,
      kisa_aciklama: haber.kisa_aciklama || '',
      detayli_icerik: haber.detayli_icerik || '',
      gorsel_url: haber.gorsel_url || '',
      video_url: haber.video_url || '',
      yayin_tarihi: new Date(haber.yayin_tarihi).toISOString().slice(0, 16),
      durum: haber.durum,
      haber_turu: haber.haber_turu,
      etiketler: haber.etiketler || []
    });
    setShowYeniHaberForm(true);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push('/');
    } catch (error) {
      console.error('[AdminHaberler]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/');
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'yayinda':
        return 'bg-green-100 text-green-800';
      case 'taslak':
        return 'bg-yellow-100 text-yellow-800';
      case 'arsiv':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTurColor = (tur: string) => {
    switch (tur) {
      case 'duyuru':
        return 'bg-red-100 text-red-800';
      case 'haber':
        return 'bg-blue-100 text-blue-800';
      case 'danisan_notu':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHaberler = haberler.filter(haber => {
    const durumMatch = selectedDurum === 'Tümü' || haber.durum === selectedDurum;
    const turMatch = selectedTur === 'Tümü' || haber.haber_turu === selectedTur;
    const searchMatch = haber.baslik.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (haber.kisa_aciklama && haber.kisa_aciklama.toLowerCase().includes(searchTerm.toLowerCase()));
    return durumMatch && turMatch && searchMatch;
  });

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Haberler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!getSupabaseClient()?.auth.getSession()) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Hata:</strong> Admin girişi gerekli
          </div>
          <Link href="/admin-login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
            Admin Girişi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer" style={{ fontFamily: 'Pacifico' }}>
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <span>Haberler & Bülten Yönetimi</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  📰 Supabase Entegre
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <span className="text-gray-600">Yönetici</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar activeMenuItem="Haberler" setActiveMenuItem={() => {}} />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Haber</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.toplam}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <i className="ri-newspaper-line text-white text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Yayında</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.yayinda}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <i className="ri-live-line text-white text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Taslak</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.taslak}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                    <i className="ri-draft-line text-white text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Bu Ay</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.bu_ay}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <i className="ri-calendar-line text-white text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Haberlerde ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <select
                    value={selectedDurum}
                    onChange={(e) => setSelectedDurum(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                  >
                    <option value="Tümü">Tüm Durumlar</option>
                    <option value="yayinda">Yayında</option>
                    <option value="taslak">Taslak</option>
                    <option value="arsiv">Arşiv</option>
                  </select>

                  <select
                    value={selectedTur}
                    onChange={(e) => setSelectedTur(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                  >
                    <option value="Tümü">Tüm Türler</option>
                    <option value="duyuru">Duyuru</option>
                    <option value="haber">Haber</option>
                    <option value="danisan_notu">Danışman Notu</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingHaber(null);
                    setHaberForm({
                      baslik: '',
                      kisa_aciklama: '',
                      detayli_icerik: '',
                      gorsel_url: '',
                      video_url: '',
                      yayin_tarihi: new Date().toISOString().slice(0, 16),
                      durum: 'taslak',
                      haber_turu: 'haber',
                      etiketler: []
                    });
                    setShowYeniHaberForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg"
                >
                  <i className="ri-add-line"></i>
                  <span>Yeni Haber</span>
                </button>
              </div>
            </div>

            {/* New/Edit Form Modal */}
            {showYeniHaberForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {editingHaber ? 'Haberi Düzenle' : 'Yeni Haber Oluştur'}
                      </h2>
                      <button
                        onClick={() => {
                          setShowYeniHaberForm(false);
                          setEditingHaber(null);
                        }}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <i className="ri-close-line text-gray-600"></i>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleHaberSubmit} className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Haber Başlığı *
                        </label>
                        <input
                          type="text"
                          value={haberForm.baslik}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, baslik: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Haber başlığını giriniz"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Haber Türü
                        </label>
                        <select
                          value={haberForm.haber_turu}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, haber_turu: e.target.value as any }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                        >
                          <option value="haber">Haber</option>
                          <option value="duyuru">Duyuru</option>
                          <option value="danisan_notu">Danışman Notu</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Durum
                        </label>
                        <select
                          value={haberForm.durum}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, durum: e.target.value as any }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                        >
                          <option value="taslak">Taslak</option>
                          <option value="yayinda">Yayında</option>
                          <option value="arsiv">Arşiv</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Yayın Tarihi
                        </label>
                        <input
                          type="datetime-local"
                          value={haberForm.yayin_tarihi}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, yayin_tarihi: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Görsel URL (Opsiyonel)
                        </label>
                        <input
                          type="url"
                          value={haberForm.gorsel_url}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, gorsel_url: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          YouTube Video URL (Opsiyonel)
                        </label>
                        <input
                          type="url"
                          value={haberForm.video_url}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, video_url: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kısa Açıklama
                        </label>
                        <textarea
                          value={haberForm.kisa_aciklama}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, kisa_aciklama: e.target.value }))}
                          rows={3}
                          maxLength={300}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                          placeholder="Haberin kısa açıklaması (maksimum 300 karakter)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {haberForm.kisa_aciklama.length}/300 karakter
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Detaylı İçerik
                        </label>
                        <textarea
                          value={haberForm.detayli_icerik}
                          onChange={(e) => setHaberForm(prev => ({ ...prev, detayli_icerik: e.target.value }))}
                          rows={8}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                          placeholder="Haberin detaylı içeriği..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Etiketler (Virgülle ayırın)
                        </label>
                        <input
                          type="text"
                          value={haberForm.etiketler.join(', ')}
                          onChange={(e) => setHaberForm(prev => ({
                            ...prev,
                            etiketler: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="örnek: e-ticaret, b2b, ihracat"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowYeniHaberForm(false);
                          setEditingHaber(null);
                        }}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg"
                      >
                        {editingHaber ? 'Güncelle' : 'Oluştur'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* News List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Haberler ({filteredHaberler.length})
                </h2>
              </div>

              {filteredHaberler.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="ri-newspaper-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm || selectedDurum !== 'Tümü' || selectedTur !== 'Tümü' 
                      ? 'Filtreye uygun haber bulunamadı'
                      : 'Henüz haber eklenmemiş'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || selectedDurum !== 'Tümü' || selectedTur !== 'Tümü'
                      ? 'Filtreleri değiştirerek tekrar deneyebilirsiniz.'
                      : 'İlk haberi oluşturmak için "Yeni Haber" butonuna tıklayın.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredHaberler.map((haber) => (
                    <div key={haber.id} className="p-6 hover:bg-gray-50/50 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDurumColor(haber.durum)}`}>
                              {haber.durum === 'yayinda' ? 'Yayında' : 
                               haber.durum === 'taslak' ? 'Taslak' : 'Arşiv'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTurColor(haber.haber_turu)}`}>
                              {haber.haber_turu === 'duyuru' ? 'Duyuru' :
                               haber.haber_turu === 'haber' ? 'Haber' : 'Danışman Notu'}
                            </span>
                            {haber.etiketler && haber.etiketler.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {haber.etiketler.slice(0, 3).map((etiket, index) => (
                                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                    {etiket}
                                  </span>
                                ))}
                                {haber.etiketler.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                    +{haber.etiketler.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {haber.baslik}
                          </h3>

                          {haber.kisa_aciklama && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {haber.kisa_aciklama}
                            </p>
                          )}

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <i className="ri-calendar-line text-blue-600"></i>
                              <span>
                                {new Date(haber.yayin_tarihi).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <i className="ri-time-line text-green-600"></i>
                              <span>
                                {new Date(haber.olusturma_tarihi).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <i className="ri-eye-line text-purple-600"></i>
                              <span>{haber.okunma_sayisi || 0} okuma</span>
                            </div>
                            {haber.gorsel_url && (
                              <div className="flex items-center space-x-2">
                                <i className="ri-image-line text-orange-600"></i>
                                <span>Görsel var</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-6 flex flex-col space-y-2">
                          {/* Status Change Buttons */}
                          {haber.durum !== 'yayinda' && (
                            <button
                              onClick={() => handleStatusChange(haber.id, 'yayinda')}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors cursor-pointer text-sm whitespace-nowrap"
                            >
                              📢 Yayınla
                            </button>
                          )}

                          {haber.durum === 'yayinda' && (
                            <button
                              onClick={() => handleStatusChange(haber.id, 'taslak')}
                              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors cursor-pointer text-sm whitespace-nowrap"
                            >
                              📝 Taslağa Al
                            </button>
                          )}

                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEdit(haber)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer text-sm"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button
                              onClick={() => handleHaberDelete(haber.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors cursor-pointer text-sm"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
