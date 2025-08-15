
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface Proje {
  id: number;
  projeAdi: string;
  aciklama: string;
  firmaAdi: string;
  firmaId: number;
  durum: string;
  oncelik: string;
  ilerlemeYuzdesi: number;
  baslangicTarihi: string;
  bitisTarihi: string;
  atananFirmalar: number[];
  olusturmaTarihi: string;
  altProjeSayisi?: number;
  toplamGorevSayisi?: number;
  firmaAdlari?: string[];
}

interface LiderlikTablosu {
  FirmaID: number;
  FirmaAdi: string;
  GenelIlerlemeYuzdesi: number;
  TamamlananGorevSayisi: number;
  ToplamGorevSayisi: number;
}

interface ProjeStats {
  toplamProjeSayisi: number;
  aktifProjeSayisi: number;
  tamamlananProjeSayisi: number;
  toplamGorevSayisi: number;
  tamamlananGorevSayisi: number;
}

export default function AdminProjeYonetimiPage() {
  const [loading, setLoading] = useState(true);
  const [projeler, setProjeler] = useState<Proje[]>([]);
  const [liderlikTablosu, setLiderlikTablosu] = useState<LiderlikTablosu[]>([]);
  const [activeTab, setActiveTab] = useState('projeler');
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<ProjeStats>({
    toplamProjeSayisi: 0,
    aktifProjeSayisi: 0,
    tamamlananProjeSayisi: 0,
    toplamGorevSayisi: 0,
    tamamlananGorevSayisi: 0
  });

  const router = useRouter();

  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/admin-dashboard' },
    { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar' },
    { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi', active: true },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talepleri', href: '/admin-randevu-talepleri' },
    { icon: 'ri-graduation-cap-line', label: 'Eğitim Yönetimi', href: '/admin-egitim-yonetimi' },
    { icon: 'ri-calendar-event-line', label: 'Etkinlik Yönetimi', href: '/admin-etkinlik-yonetimi' },
    { icon: 'ri-bar-chart-line', label: 'Dönem Yönetimi', href: '/admin-donem-yonetimi' },
    { icon: 'ri-discuss-line', label: 'Forum Yönetimi', href: '/admin-forum-yonetimi' },
    { icon: 'ri-file-text-line', label: 'Destek Dokümanları', href: '/admin-destek-dokumanlari' },
    { icon: 'ri-team-line', label: 'Kullanıcılar (Personel)', href: '/admin-kullanici-yonetimi' },
    { icon: 'ri-check-double-line', label: 'Görev Onayları', href: '/admin-gorev-onaylari' },
  ];

  useEffect(() => {
    cleanupAllData();
    checkAuth();
  }, []);

  const cleanupAllData = () => {
    console.log('🧹 TÜM ESKİ VERİLER TEMİZLENİYOR...');

    // LocalStorage temizliği
    const keysToClean = [
      'projeler', 'liderlikTablosu', 'projeStats',
      'adminProjeler', 'projeYonetimi', 'testProjeler',
      'mockProjeler', 'adminProjeData', 'projeListesi'
    ];

    keysToClean.forEach(key => {
      localStorage.removeItem(key);
    });

    // SessionStorage temizliği
    keysToClean.forEach(key => {
      sessionStorage.removeItem(key);
    });

    console.log('✅ Tüm eski veriler temizlendi!');
  };

  const checkAuth = async () => {
    try {
      // Önce localStorage kontrolü yap
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Proje Yönetimi):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Proje Yönetimi), veriler yükleniyor...');
        await loadDirectSupabaseData();
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

      await loadDirectSupabaseData();
    } catch (error) {
      console.error('[AdminProjeYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
      setLoading(false);
    }
  };

  const loadDirectSupabaseData = async () => {
    try {
      setLoading(true);
      setMessage('Supabase verileri yükleniyor...');

      console.log('🔄 DİREKT SUPABASE VERİ ÇEKME BAŞLIYOR...');

      if (!getSupabaseClient()) {
        console.error('❌ Supabase bağlantısı yok!');
        setMessage('❌ Supabase bağlantısı kurulamadı');
        setSupabaseConnected(false);
        setLoading(false);
        return;
      }

      // 1. PROJELER TABLOSUNDAN DİREKT VERİ ÇEK
      console.log('📊 Projeler tablosundan veri çekiliyor...');
      const { data: projelerRaw, error: projelerError } = await getSupabaseClient()
        .from('projeler')
        .select(`
          id,
          proje_adi,
          aciklama,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi,
          hedef_firmalar,
          kategori,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (projelerError) {
        console.error('❌ Projeler sorgu hatası:', projelerError);
        console.log('⚠️ Projeler tablosu henüz oluşturulmamış, boş liste döndürülüyor');
        setProjeler([]);
        return;
      }

      console.log('✅ Projeler başarıyla çekildi:', projelerRaw?.length || 0, 'adet');

      // 2. FİRMALAR TABLOSUNDAN DİREKT VERİ ÇEK
      console.log('🏢 Firmalar tablosundan veri çekiliyor...');
      const { data: firmalarRaw, error: firmalarError } = await getSupabaseClient()
        .from('firmalar')
        .select(`
          id,
          firma_adi,
          durum
        `)
        .eq('durum', 'Aktif');

      if (firmalarError) {
        console.error('❌ Firmalar sorgu hatası:', firmalarError);
        console.log('⚠️ Firmalar olmadan devam ediliyor...');
      }

      const firmalarData = firmalarRaw || [];

      console.log('✅ Firmalar başarıyla çekildi:', firmalarData.length, 'adet');

      // 3. ALT PROJELER VE GÖREVLER İÇİN PARALEL SORGULAR
      const projelerData = projelerRaw || [];

      // Her proje için alt proje ve görev sayılarını hesapla
      const projelerWithStats = await Promise.all(
        projelerData.map(async (proje: any) => {
          try {
            // Alt proje sayısı
            const { data: altProjeler } = await getSupabaseClient()
              .from('alt_projeler')
              .select('id')
              .eq('proje_id', proje.id);

            // Görev sayısı  
            const { data: gorevler } = await getSupabaseClient()
              .from('gorevler')
              .select('id')
              .eq('proje_id', proje.id);

            return {
              ...proje,
              altProjeSayisi: altProjeler?.length || 0,
              toplamGorevSayisi: gorevler?.length || 0
            };
          } catch (error) {
            console.warn(`⚠️ Proje ${proje.id} istatistikleri hesaplanamadı:`, error);
            return {
              ...proje,
              altProjeSayisi: 0,
              toplamGorevSayisi: 0
            };
          }
        })
      );

      // 4. FİRMA HARITASI OLUŞTUR
      const firmaMap = new Map();
      firmalarData.forEach((firma: any) => {
        if (firma?.id && firma?.firma_adi) {
          firmaMap.set(firma.id, firma.firma_adi);
        }
      });

      // 5. PROJELERİ FORMATLA
      const formattedProjeler: Proje[] = projelerWithStats.map((proje: any) => {
        // Hedef firmaları işle
        const hedefFirmalar = Array.isArray(proje.hedef_firmalar) ? proje.hedef_firmalar : [];
        const firmaAdlari = hedefFirmalar
          .map((firmaId: any) => firmaMap.get(Number(firmaId)))
          .filter(Boolean);

        // İlerleme hesapla (basit mantık)
        const ilerlemeYuzdesi = proje.toplamGorevSayisi > 0
          ? Math.min(100, Math.round((proje.altProjeSayisi / Math.max(1, proje.toplamGorevSayisi)) * 100))
          : 0;

        return {
          id: proje.id,
          projeAdi: proje.proje_adi || 'İsimsiz Proje',
          aciklama: proje.aciklama || 'Açıklama yok',
          firmaAdi: firmaAdlari.join(', ') || 'Atanmamış',
          firmaId: hedefFirmalar[0] || 0,
          durum: proje.durum || 'Aktif',
          oncelik: proje.oncelik || 'Orta',
          ilerlemeYuzdesi: ilerlemeYuzdesi,
          baslangicTarihi: proje.baslangic_tarihi || new Date().toISOString().split('T')[0],
          bitisTarihi: proje.bitis_tarihi || new Date().toISOString().split('T')[0],
          atananFirmalar: hedefFirmalar,
          olusturmaTarihi: proje.created_at || new Date().toISOString(),
          altProjeSayisi: proje.altProjeSayisi,
          toplamGorevSayisi: proje.toplamGorevSayisi,
          firmaAdlari: firmaAdlari
        };
      });

      console.log('✅ Projeler formatlandı:', formattedProjeler.length, 'adet');

      // 6. İSTATİSTİKLER HESAPLA
      const projeStats: ProjeStats = {
        toplamProjeSayisi: formattedProjeler.length,
        aktifProjeSayisi: formattedProjeler.filter(p => p.durum === 'Aktif').length,
        tamamlananProjeSayisi: formattedProjeler.filter(p => p.durum === 'Tamamlandı').length,
        toplamGorevSayisi: formattedProjeler.reduce((sum, p) => sum + (p.toplamGorevSayisi || 0), 0),
        tamamlananGorevSayisi: formattedProjeler.reduce((sum, p) =>
          sum + Math.floor((p.toplamGorevSayisi || 0) * (p.ilerlemeYuzdesi / 100)), 0)
      };

      // 7. LİDERLİK TABLOSU OLUŞTUR
      const liderlikData: LiderlikTablosu[] = [];

      firmalarData.slice(0, 10).forEach((firma: any) => {
        const firmaProjeleri = formattedProjeler.filter(p =>
          p.atananFirmalar.includes(firma.id)
        );

        const toplamGorev = firmaProjeleri.reduce((sum, p) => sum + (p.toplamGorevSayisi || 0), 0);
        const ortalamailerleme = firmaProjeleri.length > 0
          ? firmaProjeleri.reduce((sum, p) => sum + p.ilerlemeYuzdesi, 0) / firmaProjeleri.length
          : 0;

        liderlikData.push({
          FirmaID: firma.id,
          FirmaAdi: firma.firma_adi,
          GenelIlerlemeYuzdesi: Math.round(ortalamailerleme),
          TamamlananGorevSayisi: Math.floor(toplamGorev * (ortalamailerleme / 100)),
          ToplamGorevSayisi: toplamGorev
        });
      });

      liderlikData.sort((a, b) => b.GenelIlerlemeYuzdesi - a.GenelIlerlemeYuzdesi);

      // 8. STATE’LERİ GÜNCELLE
      setProjeler(formattedProjeler);
      setStats(projeStats);
      setLiderlikTablosu(liderlikData);
      setSupabaseConnected(true);
      setMessage(`✅ Supabase entegrasyonu başarılı! ${formattedProjeler.length} proje, ${firmalarData.length} firma yüklendi.`);

      console.log('🎉 TÜM SUPABASE VERİLERİ BAŞARIYLA YÜKLENDİ!');

      // Başarı mesajını otomatik temizle
      setTimeout(() => setMessage(''), 5000);

    } catch (error: any) {
      console.error('💥 SUPABASE VERİ YÜKLEME HATASI:', error);

      // Hata durumunda boş veriler
      setProjeler([]);
      setStats({
        toplamProjeSayisi: 0,
        aktifProjeSayisi: 0,
        tamamlananProjeSayisi: 0,
        toplamGorevSayisi: 0,
        tamamlananGorevSayisi: 0
      });
      setLiderlikTablosu([]);
      setSupabaseConnected(false);
      setMessage('⚠️ Veriler yüklenemedi, boş liste gösteriliyor');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    console.log('🔄 Supabase verileri yenileniyor...');
    setMessage('🔄 Veriler yenileniyor...');
    cleanupAllData();
    await loadDirectSupabaseData();
  };

  const handleLogout = async () => {
    try {
      cleanupAllData();
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push('/');
    } catch (error) {
      console.error('[AdminProjeYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/');
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Tamamlandı':
        return 'bg-green-100 text-green-800';
      case 'Devam Ediyor':
      case 'Aktif':
        return 'bg-blue-100 text-blue-800';
      case 'Başlangıç':
        return 'bg-yellow-100 text-yellow-800';
      case 'Beklemede':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOncelikColor = (oncelik: string) => {
    switch (oncelik) {
      case 'Yüksek':
        return 'bg-red-100 text-red-800';
      case 'Orta':
        return 'bg-yellow-100 text-yellow-800';
      case 'Düşük':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIlerlemeRenk = (ilerleme: number) => {
    if (ilerleme >= 65) return 'bg-green-500';
    if (ilerleme >= 45) return 'bg-blue-500';
    if (ilerleme >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">
            🔄 Supabase Proje Verileri Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[ 'Pacifico']">
                logo
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Supabase Proje Yönetimi</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {supabaseConnected ? 'Supabase Bağlı' : 'Bağlantı Yok'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                title="Supabase Verilerini Yenile"
              >
                <i className="ri-refresh-line"></i>
                <span className="hidden sm:inline">Yenile</span>
              </button>
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
        <div className="w-64 bg-white shadow-lg h-screen sticky top-0">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${item.active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Success/Error Message */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg border ${message.includes('başarılı') || message.includes('✅')
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : message.includes('yenileniyor') || message.includes('🔄')
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-red-50 border-red-200 text-red-800'
                  }`}
              >
                <div className="flex items-center">
                  <i
                    className={`${message.includes('başarılı') || message.includes('✅')
                      ? 'ri-check-line'
                      : message.includes('yenileniyor') || message.includes('🔄')
                      ? 'ri-refresh-line animate-spin'
                      : 'ri-error-warning-line'
                      } mr-2`}
                  ></i>
                  <span className="text-sm font-medium">{message}</span>
                </div>
              </div>
            )}

            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Supabase Proje Yönetimi</h1>
              <p className="text-gray-600 mt-2">Tamamen Supabase entegrasyonlu proje yönetim sistemi</p>

              {/* SUPABASE ENTEGRASYON BİLGİSİ */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <i className="ri-database-line text-blue-600 mr-2"></i>
                  <h3 className="text-sm font-semibold text-blue-800">Supabase Entegrasyonu</h3>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">• Projeler:</span>
                    <span>projeler tablosundan gerçek zamanlı</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">• Alt Projeler:</span>
                    <span>alt_projeler tablosundan otomatik</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">• Görevler:</span>
                    <span>gorevler tablosundan dinamik</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">• Firmalar:</span>
                    <span>firmalar tablosundan eşleştirilmiş</span>
                  </div>
                </div>
              </div>

              {/* SUPABASE BAĞLANTI DURUMU */}
              {supabaseConnected ? (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-wifi-line text-green-600 mr-2"></i>
                    <h3 className="text-sm font-semibold text-green-800">Supabase Bağlantısı Aktif</h3>
                    <span className="ml-2 text-sm text-green-700">
                      {projeler.length} proje • {liderlikTablosu.length} firma liderlik analizi
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-wifi-off-line text-red-600 mr-2"></i>
                    <h3 className="text-sm font-semibold text-red-800">Supabase Bağlantı Sorunu</h3>
                    <button
                      onClick={refreshData}
                      className="ml-4 text-sm text-red-700 underline cursor-pointer hover:text-red-900"
                    >
                      Yeniden Dene
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* İSTATİSTİK KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <i className="ri-folder-line text-blue-600 text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Toplam Proje</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.toplamProjeSayisi}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <i className="ri-play-circle-line text-green-600 text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Aktif Proje</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.aktifProjeSayisi}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <i className="ri-check-circle-line text-purple-600 text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.tamamlananProjeSayisi}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <i className="ri-task-line text-orange-600 text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Toplam Görev</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.toplamGorevSayisi}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-teal-100 rounded-full">
                    <i className="ri-check-double-line text-teal-600 text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tamamlanan Görev</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.tamamlananGorevSayisi}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('projeler')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'projeler'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Supabase Projeler ({projeler?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('liderlik')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'liderlik'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Liderlik Analizi ({liderlikTablosu?.length || 0})
                </button>
                <Link
                  href="/admin-proje-yonetimi/yeni-proje"
                  className="px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2"
                >
                  <i className="ri-add-line"></i>
                  <span>Yeni Proje</span>
                </Link>
              </div>
            </div>

            {/* Projeler Tab */}
            {activeTab === 'projeler' && (
              <div>
                {projeler && projeler.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {projeler.map((proje) => (
                      <div
                        key={proje.id}
                        className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                      >
                        {/* Proje Header */}
                        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex space-x-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDurumColor(proje.durum)}`}>
                                {proje.durum}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOncelikColor(proje.oncelik)}`}>
                                {proje.oncelik}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <i className="ri-database-line"></i>
                              <span>Supabase ID: {proje.id}</span>
                            </div>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                            {proje.projeAdi}
                          </h3>

                          <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                            {proje.aciklama}
                          </p>

                          {/* İSTATİSTİKLER */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center bg-white/60 rounded-lg p-3">
                              <div className="text-lg font-bold text-blue-600">{proje.altProjeSayisi || 0}</div>
                              <div className="text-xs text-gray-600">Alt Proje</div>
                            </div>
                            <div className="text-center bg-white/60 rounded-lg p-3">
                              <div className="text-lg font-bold text-orange-600">{proje.toplamGorevSayisi || 0}</div>
                              <div className="text-xs text-gray-600">Toplam Görev</div>
                            </div>
                            <div className="text-center bg-white/60 rounded-lg p-3">
                              <div className="text-lg font-bold text-green-600">{proje.atananFirmalar.length}</div>
                              <div className="text-xs text-gray-600">Atanan Firma</div>
                            </div>
                          </div>
                        </div>

                        {/* Proje Body */}
                        <div className="p-6 space-y-4">
                          {/* İlerleme Çubuğu */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">İlerleme</span>
                              <span className="text-sm font-bold text-gray-900">{proje.ilerlemeYuzdesi}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getIlerlemeRenk(proje.ilerlemeYuzdesi)} shadow-sm`}
                                style={{ width: `${proje.ilerlemeYuzdesi}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Tarih Aralığı */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2 text-green-600">
                              <i className="ri-calendar-line"></i>
                              <span className="font-medium">{formatDate(proje.baslangicTarihi)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-red-600">
                              <i className="ri-flag-line"></i>
                              <span className="font-medium">{formatDate(proje.bitisTarihi)}</span>
                            </div>
                          </div>

                          {/* Firma Bilgileri */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Atanan Firmalar</span>
                              <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {proje.atananFirmalar.length} firma
                              </span>
                            </div>
                            <div className="space-y-1">
                              {(proje.firmaAdlari || []).slice(0, 2).map((firmaAdi, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-sm text-gray-700">{firmaAdi}</span>
                                </div>
                              ))}
                              {(proje.firmaAdlari || []).length > 2 && (
                                <div className="text-xs text-gray-500 ml-4">
                                  +{(proje.firmaAdlari || []).length - 2} firma daha
                                </div>
                              )}
                              {(proje.firmaAdlari || []).length === 0 && (
                                <div className="text-sm text-gray-500 italic">
                                  Henüz firma atanmamış
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Proje Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500">
                              Oluşturulma: {formatDate(proje.olusturmaTarihi)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/admin-proje-yonetimi/detay/${proje.id}`}
                              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm font-medium"
                            >
                              <i className="ri-eye-line"></i>
                              <span>Detay</span>
                            </Link>
                            <Link
                              href={`/admin-proje-yonetimi/duzenle/${proje.id}`}
                              className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer text-sm font-medium"
                            >
                              <i className="ri-edit-line"></i>
                              <span>Düzenle</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="ri-database-line text-red-500 text-3xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Supabase'de Proje Bulunamadı</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {supabaseConnected
                        ? 'Henüz hiç proje eklenmemiş. İlk projeyi oluşturun.'
                        : 'Supabase bağlantısı kurulamadı. Lütfen bağlantıyı kontrol edin.'
                      }
                    </p>
                    <div className="space-y-3">
                      <Link
                        href="/admin-proje-yonetimi/yeni-proje"
                        className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 cursor-pointer font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        İlk Projeyi Supabase'e Ekle
                      </Link>
                      <div className="mt-3">
                        <button
                          onClick={refreshData}
                          className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer font-medium"
                        >
                          Verileri Yenile
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Liderlik Analizi Tab */}
            {activeTab === 'liderlik' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Supabase Firma Liderlik Analizi</h2>
                  <p className="text-gray-600 mt-1">Gerçek zamanlı Supabase verilerine dayalı firma performans sıralaması</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {liderlikTablosu && liderlikTablosu.length > 0 ? (
                      liderlikTablosu.map((firma, index) => (
                        <div key={`supabase-liderlik-${firma.FirmaID}`} className="flex items-center justify-between p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${index === 0
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                : index === 1
                                ? 'bg-gradient-to-r from-gray-400 to-gray-600'
                                : index === 2
                                ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                : 'bg-gradient-to-r from-blue-400 to-blue-600'
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{firma.FirmaAdi}</h3>
                              <p className="text-sm text-gray-500">
                                {firma.TamamlananGorevSayisi} / {firma.ToplamGorevSayisi} görev • Supabase ID: {firma.FirmaID}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <div className="text-3xl font-bold text-gray-900">{firma.GenelIlerlemeYuzdesi}%</div>
                              <div className="text-sm text-gray-500">İlerleme</div>
                            </div>
                            <div className="w-40 bg-gray-200 rounded-full h-4 shadow-inner">
                              <div
                                className={`h-4 rounded-full transition-all duration-700 ${getIlerlemeRenk(firma.GenelIlerlemeYuzdesi)} shadow-sm`}
                                style={{ width: `${firma.GenelIlerlemeYuzdesi}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="ri-database-line text-red-400 text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Liderlik Verisi Yok</h3>
                        <p className="text-gray-500">
                          {supabaseConnected
                            ? 'Henüz firma performans verisi bulunmuyor. Projeler ve görevler tamamlandıkça veriler görünecek.'
                            : 'Supabase bağlantısı kurulamadığı için liderlik analizi yapılamıyor.'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
