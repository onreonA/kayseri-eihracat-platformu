
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModernLayout from '../../components/Layout/ModernLayout';
import { supabase } from '@/lib/supabase-services';
import Link from 'next/link';

interface Proje {
  id: number;
  projeAdi: string;
  aciklama: string;
  durum: string;
  oncelik: string;
  ilerlemeYuzdesi: number;
  baslangicTarihi: string;
  bitisTarihi: string;
  altProjeSayisi: number;
  toplamGorevSayisi: number;
  tamamlananGorevSayisi: number;
  kategori?: string;
  sorumluKisi?: string;
  olusturmaTarihi: string;
}

export default function ProjelerimPage() {
  const [loading, setLoading] = useState(true);
  const [projeler, setProjeler] = useState<Proje[]>([]);
  const [filteredProjeler, setFilteredProjeler] = useState<Proje[]>([]);
  const [activeFilter, setActiveFilter] = useState('hepsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [firmaId, setFirmaId] = useState<number>(0);
  const [firmaAdi, setFirmaAdi] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = () => {
      try {
        console.log('🔐 PROJELERIM: Hızlı auth kontrolü...');

        if (typeof window === 'undefined') {
          console.log('❌ Window undefined, loading false');
          setLoading(false);
          return;
        }

        // 1. Unified format kontrolü
        const unifiedData = localStorage.getItem('user_login_data');
        if (unifiedData) {
          try {
            const parsedData = JSON.parse(unifiedData);
            if (parsedData.email && parsedData.firmaAdi && parsedData.firmaId) {
              console.log('✅ UNIFIED AUTH: Giriş geçerli');
              setFirmaId(parsedData.firmaId);
              setFirmaAdi(parsedData.firmaAdi);
              setUserEmail(parsedData.email);
              setAuthChecked(true);
              setLoading(false);
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ Unified data parse hatası:', parseError);
          }
        }

        // 2. Legacy format kontrolü
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const firma = localStorage.getItem('firmaAdi');
        const id = localStorage.getItem('firmaId');
        const email = localStorage.getItem('userEmail');

        console.log('🔍 Legacy kontrol:', { isLoggedIn, firma: !!firma, email: !!email, id: !!id });

        if (!isLoggedIn || isLoggedIn !== 'true' || !firma || !email || !id) {
          console.log('❌ AUTH BAŞARISIZ - login sayfasına gidiyor');
          router.push('/login');
          return;
        }

        console.log('✅ LEGACY AUTH: Giriş geçerli');
        setFirmaId(parseInt(id || '0'));
        setFirmaAdi(firma);
        setUserEmail(email);
        setAuthChecked(true);
        setLoading(false);

      } catch (error) {
        console.error('❌ Auth kontrol hatası:', error);
        setLoading(false);
        router.push('/login');
      }
    };

    // Direkt çalıştır
    checkAuth();
  }, [mounted, router]);

  useEffect(() => {
    if (mounted && authChecked && firmaId > 0) {
      loadProjeler();
    }
  }, [mounted, authChecked, firmaId]);

  useEffect(() => {
    filterProjeler();
  }, [activeFilter, searchQuery, projeler]);

  const loadProjeler = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        console.error('Supabase bağlantısı mevcut değil');
        setLoading(false);
        return;
      }

      console.log(`Firma ${firmaId} için projeler yükleniyor...`);

      const { data: projelerData, error: projelerError } = await supabase
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
          created_at
        `)
        .contains('hedef_firmalar', [firmaId])
        .order('created_at', { ascending: false });

      if (projelerError) {
        console.error('Projeler yüklenirken hata:', projelerError);
        setLoading(false);
        return;
      }

      if (!projelerData || projelerData.length === 0) {
        console.log('Bu firma için proje bulunamadı');
        setProjeler([]);
        setLoading(false);
        return;
      }

      console.log(`${projelerData.length} proje bulundu`);

      const projelerWithStats = await Promise.all(
        projelerData.map(async (proje) => {
          try {
            const { data: altProjeler, error: altProjeError } = await supabase
              .from('alt_projeler')
              .select('id')
              .eq('ana_proje_id', proje.id);

            const altProjeSayisi = altProjeError ? 0 : (altProjeler?.length || 0);

            let toplamGorevSayisi = 0;
            let tamamlananGorevSayisi = 0;

            if (altProjeSayisi > 0 && altProjeler) {
              for (const altProje of altProjeler) {
                try {
                  const { data: altProjeGorevler, error: altProjeGorevError } = await supabase
                    .from('gorevler')
                    .select('id, durum')
                    .eq('alt_proje_id', altProje.id)
                    .contains('atanan_firmalar', [firmaId]);

                  if (!altProjeGorevError && altProjeGorevler) {
                    toplamGorevSayisi += altProjeGorevler.length;
                    tamamlananGorevSayisi += altProjeGorevler.filter(g => g.durum === 'Tamamlandı').length;
                  }
                } catch (altProjeGorevError) {
                  console.warn(`Alt proje ${altProje.id} görevleri alınamadı:`, altProjeGorevError);
                }
              }
            } else {
              const { data: direkGorevler, error: direkGorevError } = await supabase
                .from('gorevler')
                .select('id, durum')
                .eq('proje_id', proje.id)
                .contains('atanan_firmalar', [firmaId]);

              if (!direkGorevError && direkGorevler) {
                toplamGorevSayisi = direkGorevler.length;
                tamamlananGorevSayisi = direkGorevler.filter(g => g.durum === 'Tamamlandı').length;
              }
            }

            const ilerlemeYuzdesi = toplamGorevSayisi > 0
              ? Math.round((tamamlananGorevSayisi / toplamGorevSayisi) * 100)
              : 0;

            return {
              id: proje.id,
              projeAdi: proje.proje_adi,
              aciklama: proje.aciklama || '',
              durum: mapDurumFromDatabase(proje.durum || 'Aktif'),
              oncelik: proje.oncelik || 'Orta',
              ilerlemeYuzdesi: ilerlemeYuzdesi,
              baslangicTarihi: proje.baslangic_tarihi || '',
              bitisTarihi: proje.bitis_tarihi || '',
              altProjeSayisi: altProjeSayisi,
              toplamGorevSayisi: toplamGorevSayisi,
              tamamlananGorevSayisi: tamamlananGorevSayisi,
              kategori: proje.kategori || 'Genel',
              sorumluKisi: 'Proje Yöneticisi',
              olusturmaTarihi: proje.created_at || ''
            };
          } catch (error) {
            console.error(`Proje ${proje.id} istatistikleri alınırken hata:`, error);
            return {
              id: proje.id,
              projeAdi: proje.proje_adi,
              aciklama: proje.aciklama || '',
              durum: 'Aktif',
              oncelik: 'Orta',
              ilerlemeYuzdesi: 0,
              baslangicTarihi: proje.baslangic_tarihi || '',
              bitisTarihi: proje.bitis_tarihi || '',
              altProjeSayisi: 0,
              toplamGorevSayisi: 0,
              tamamlananGorevSayisi: 0,
              kategori: proje.kategori || 'Genel',
              sorumluKisi: 'Proje Yöneticisi',
              olusturmaTarihi: proje.created_at || ''
            };
          }
        })
      );

      console.log('Projelerim: Projeler başarıyla yüklendi:', projelerWithStats);
      setProjeler(projelerWithStats);

    } catch (error) {
      console.error('Projeler yüklenirken sistem hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapDurumFromDatabase = (dbDurum: string): string => {
    switch (dbDurum) {
      case 'Aktif':
        return 'Devam Ediyor';
      case 'Pasif':
        return 'Beklemede';
      case 'Tamamlandı':
      case 'Tamamlandi':
        return 'Tamamlandı';
      default:
        return 'Devam Ediyor';
    }
  };

  const filterProjeler = () => {
    let filtered = projeler;

    if (activeFilter !== 'hepsi') {
      filtered = filtered.filter(proje =>
        proje.durum.toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(proje =>
        proje.projeAdi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proje.aciklama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proje.kategori?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProjeler(filtered);
  };

  const handleProjeDetayClick = (proje: Proje) => {
    console.log('Proje detay sayfasına yönlendiriliyor:', {
      proje_id: proje.id,
      proje_adi: proje.projeAdi,
      alt_proje_sayisi: proje.altProjeSayisi
    });

    try {
      if (proje.altProjeSayisi > 0) {
        console.log('Alt projeler mevcut, alt projeler sayfasına yönlendiriliyor...');
        router.push(`/alt-projeler/${proje.id}`);
      } else {
        console.log('Alt proje yok, proje detay sayfasına yönlendiriliyor...');
        router.push(`/proje-detay/${proje.id}`);
      }
    } catch (error) {
      console.error('Proje detay yönlendirme hatası:', error);

      if (typeof window !== 'undefined') {
        if (proje.altProjeSayisi > 0) {
          window.location.href = `/alt-projeler/${proje.id}`;
        } else {
          window.location.href = `/proje-detay/${proje.id}`;
        }
      }
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Tamamlandı':
        return 'bg-green-100 text-green-800';
      case 'Devam Ediyor':
        return 'bg-blue-100 text-blue-800';
      case 'Planlama':
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
    if (ilerleme >= 80) return 'from-green-400 to-green-600';
    if (ilerleme >= 60) return 'from-blue-400 to-blue-600';
    if (ilerleme >= 40) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading || !mounted) {
    return (
      <ModernLayout userEmail={'user@example.com'} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Projeleriniz yükleniyor...</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  if (!authChecked || !firmaId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Hata:</strong> Oturum açmanız gerekli
          </div>
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  const filterCounts = {
    hepsi: projeler.length,
    'devam ediyor': projeler.filter(p => p.durum === 'Devam Ediyor').length,
    'tamamlandı': projeler.filter(p => p.durum === 'Tamamlandı').length,
    'planlama': projeler.filter(p => p.durum === 'Planlama').length,
    'beklemede': projeler.filter(p => p.durum === 'Beklemede').length
  };

  return (
    <ModernLayout userEmail={userEmail} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Modern Header Section - Dashboard tarzı */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <i className="ri-folder-3-line text-white text-2xl"></i>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{projeler.length}</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
                    Projelerim 📁
                  </h1>
                  <p className="text-gray-600 text-lg mb-2">E-ihracat projelerinizi takip edin ve yönetin</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2 text-blue-600 font-medium">
                      <i className="ri-building-line"></i>
                      <span>{firmaAdi}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-purple-600 font-medium">
                      <i className="ri-folder-line"></i>
                      <span>{projeler.length} Toplam Proje</span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-600 font-medium">
                      <i className="ri-check-line"></i>
                      <span>{filterCounts.tamamlandı} Tamamlandı</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* İlerleme Çubuğu */}
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 relative"
                  style={{ width: `${Math.min((filterCounts.tamamlandı / Math.max(projeler.length, 1)) * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Başlangıç</span>
                <span className="font-medium">%{Math.round((filterCounts.tamamlandı / Math.max(projeler.length, 1)) * 100)} tamamlandı</span>
                <span>Hedef: Tüm Projeler</span>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-end space-y-3">
              {/* Çevrimiçi Durumu */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-sm font-medium text-green-700">Proje Yöneticisi</span>
                  <div className="w-px h-4 bg-green-300"></div>
                  <span className="text-xs text-green-600">{userEmail}</span>
                </div>
              </div>

              {/* Başarı Rozetleri */}
              <div className="flex items-center space-x-1">
                {projeler.length >= 5 && (
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg" title="Aktif Proje Yöneticisi">
                    <i className="ri-medal-line text-white text-sm"></i>
                  </div>
                )}
                {filterCounts.tamamlandı >= 3 && (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg" title="Proje Tamamlayıcı">
                    <i className="ri-trophy-line text-white text-sm"></i>
                  </div>
                )}
                {projeler.some(p => p.ilerlemeYuzdesi === 100) && (
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg" title="Başarı Uzmanı">
                    <i className="ri-star-line text-white text-sm"></i>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modern Filtre ve Arama */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="ri-search-line text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Proje ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white/80 backdrop-blur"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    key: 'hepsi',
                    label: 'Hepsi',
                    count: filterCounts.hepsi
                  },
                  {
                    key: 'devam ediyor',
                    label: 'Devam Ediyor',
                    count: filterCounts['devam ediyor']
                  },
                  {
                    key: 'tamamlandı',
                    label: 'Tamamlandı',
                    count: filterCounts.tamamlandı
                  },
                  {
                    key: 'beklemede',
                    label: 'Beklemede',
                    count: filterCounts.beklemede
                  }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                      activeFilter === filter.key
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/60 backdrop-blur text-gray-700 hover:bg-white/80'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjeler.map((proje) => (
            <div
              key={proje.id}
              className="group bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] transform"
              onClick={() => handleProjeDetayClick(proje)}
            >
              {/* Project Header */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDurumColor(proje.durum)}`}>
                      {proje.durum}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOncelikColor(proje.oncelik)}`}>
                      {proje.oncelik}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-full">
                    #{proje.id}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {proje.projeAdi}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {proje.aciklama}
                </p>

                {/* 3 Katman Yapısı Göstergesi */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-white/60 backdrop-blur rounded-lg p-3 group-hover:bg-white/80 transition-colors">
                    <div className="text-lg font-bold text-blue-600">1</div>
                    <div className="text-xs text-gray-600">Ana Proje</div>
                  </div>
                  <div className="text-center bg-white/60 backdrop-blur rounded-lg p-3 group-hover:bg-white/80 transition-colors">
                    <div className="text-lg font-bold text-green-600">{proje.altProjeSayisi}</div>
                    <div className="text-xs text-gray-600">Alt Proje</div>
                  </div>
                  <div className="text-center bg-white/60 backdrop-blur rounded-lg p-3 group-hover:bg-white/80 transition-colors">
                    <div className="text-lg font-bold text-orange-600">{proje.toplamGorevSayisi}</div>
                    <div className="text-xs text-gray-600">Görev</div>
                  </div>
                </div>
              </div>

              {/* Project Body */}
              <div className="p-6 space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">İlerleme</span>
                    <span className="text-sm font-bold text-gray-900">{proje.ilerlemeYuzdesi}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${getIlerlemeRenk(proje.ilerlemeYuzdesi)} transition-all duration-700 relative`}
                      style={{ width: `${proje.ilerlemeYuzdesi}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Task Progress */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Görev Durumu</span>
                    <span className="text-sm font-bold text-blue-600">
                      {proje.tamamlananGorevSayisi}/{proje.toplamGorevSayisi}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${proje.toplamGorevSayisi > 0 ? (proje.tamamlananGorevSayisi / proje.toplamGorevSayisi) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {proje.toplamGorevSayisi > 0 ? Math.round((proje.tamamlananGorevSayisi / proje.toplamGorevSayisi) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Date Range */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-green-600">
                    <i className="ri-calendar-line"></i>
                    <span>{formatDate(proje.baslangicTarihi)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <i className="ri-flag-line"></i>
                    <span>{formatDate(proje.bitisTarihi)}</span>
                  </div>
                </div>
              </div>

              {/* Project Footer */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDate(proje.olusturmaTarihi)}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-blue-600">
                    {proje.altProjeSayisi > 0 ? (
                      <>
                        <i className="ri-folder-2-line"></i>
                        <span>Alt Projeler</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-file-text-line"></i>
                        <span>Proje Detay</span>
                      </>
                    )}
                    <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjeler.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-folder-line text-blue-500 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Bu kategoride proje bulunmuyor'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery
                ? `"${searchQuery}" araması için sonuç bulunamadı. Farklı kelimeler deneyin.`
                : `${activeFilter} durumunda proje bulunmuyor.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer font-medium whitespace-nowrap"
              >
                Aramayı Temizle
              </button>
            )}
          </div>
        )}

        {/* Modern Quick Stats Footer */}
        {filteredProjeler.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center">
                <i className="ri-bar-chart-line text-white"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold">Proje İstatistikleri</h3>
                <p className="text-white/80 text-sm">Genel performans özeti</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {filteredProjeler.reduce((sum, p) => sum + p.altProjeSayisi, 0)}
                </div>
                <div className="text-sm text-white/80">Toplam Alt Proje</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {filteredProjeler.reduce((sum, p) => sum + p.toplamGorevSayisi, 0)}
                </div>
                <div className="text-sm text-white/80">Toplam Görev</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {filteredProjeler.reduce((sum, p) => sum + p.tamamlananGorevSayisi, 0)}
                </div>
                <div className="text-sm text-white/80">Tamamlanan</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round(
                    filteredProjeler.reduce((sum, p) => sum + p.ilerlemeYuzdesi, 0) / filteredProjeler.length
                  )}%
                </div>
                <div className="text-sm text-white/80">Ortalama İlerleme</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
