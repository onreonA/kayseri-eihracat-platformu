
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ModernLayout from '../../../components/Layout/ModernLayout';
import { supabase } from '../../../lib/supabase-services';
import Link from 'next/link';

interface AltProje {
  id: number;
  altProjeAdi: string;
  aciklama: string;
  durum: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  yuzde_tamamlanma: number;
  toplamGorevSayisi: number;
  tamamlananGorevSayisi: number;
  anaProjeId: number;
}

interface AnaProje {
  id: number;
  projeAdi: string;
  aciklama: string;
  durum: string;
}

interface AltProjelerClientProps {
  anaProjeId: string;
}

export default function AltProjelerClient({ anaProjeId }: AltProjelerClientProps) {
  const [loading, setLoading] = useState(true);
  const [altProjeler, setAltProjeler] = useState<AltProje[]>([]);
  const [anaProje, setAnaProje] = useState<AnaProje | null>(null);
  const [filteredAltProjeler, setFilteredAltProjeler] = useState<AltProje[]>([]);
  const [activeFilter, setActiveFilter] = useState('hepsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [firmaId, setFirmaId] = useState<number>(0);
  const [firmaAdi, setFirmaAdi] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const isMountedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    checkAuthAndLoadData();
  }, [mounted, router]);

  const checkAuthAndLoadData = async () => {
    try {
      console.log('🔐 Alt Projeler: Basit auth kontrolü başlatılıyor...');

      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      // ✅ YENİ: Daha güvenilir ve esnek auth kontrolü
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const firma = localStorage.getItem('firmaAdi');
      const id = localStorage.getItem('firmaId');
      const email = localStorage.getItem('userEmail');

      // Session backup kontrolü
      let sessionBackup = null;
      try {
        const sessionData = sessionStorage.getItem('userSession');
        if (sessionData) {
          sessionBackup = JSON.parse(sessionData);
        }
      } catch (e) {
        console.warn('Session backup kontrol edilemedi:', e);
      }

      // Ana kontrol: localStorage VEYA sessionStorage
      const hasMainAuth = (isLoggedIn === 'true' && firma && id && email);
      const hasSessionBackup = (sessionBackup?.isLoggedIn && sessionBackup?.userEmail);

      if (hasMainAuth || hasSessionBackup) {
        // Kullanılacak veri kaynağını belirle
        const finalEmail = email || sessionBackup?.userEmail || '';
        const finalFirmaAdi = firma || sessionBackup?.firmaAdi || '';
        const finalFirmaId = id || sessionBackup?.firmaId?.toString() || '0';

        if (finalEmail && finalFirmaAdi && finalFirmaId !== '0') {
          console.log('✅ Alt Projeler: Auth başarılı:', {
            source: hasMainAuth ? 'localStorage' : 'sessionStorage',
            email: finalEmail,
            firmaAdi: finalFirmaAdi
          });

          // Eğer session backup kullanıldıysa, localStorage'ı güncelle
          if (!hasMainAuth && hasSessionBackup) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', finalEmail);
            localStorage.setItem('firmaAdi', finalFirmaAdi);
            localStorage.setItem('firmaId', finalFirmaId);
            console.log('✅ localStorage session backup ile restore edildi');
          }

          if (isMountedRef.current) {
            setFirmaId(parseInt(finalFirmaId) || 0);
            setFirmaAdi(finalFirmaAdi);
            setUserEmail(finalEmail);
            setAuthChecked(true);

            // Direkt veri yüklemeyi başlat
            await loadAltProjeler(parseInt(finalFirmaId) || 0);
          }
          return;
        }
      }

      console.warn('❌ Alt Projeler: Auth kontrolü başarısız');
      // ✅ YENİ: Agresif yönlendirme yerine nazik yaklaşım
      setTimeout(() => {
        router.push('/login');
      }, 200);

    } catch (error) {
      console.error('❌ Alt Projeler auth hatası:', error);
      setTimeout(() => {
        router.push('/login');
      }, 200);
    }
  };

  const loadAltProjeler = async (currentFirmaId: number) => {
    try {
      setLoading(true);
      console.log('📂 Alt projeler yükleniyor...', { anaProjeId, firmaId: currentFirmaId });

      if (!supabase) {
        console.error('❌ Supabase bağlantısı mevcut değil');
        setLoading(false);
        return;
      }

      const anaProjeIdInt = parseInt(anaProjeId);
      if (isNaN(anaProjeIdInt) || anaProjeIdInt <= 0) {
        console.error('❌ Geçersiz ana proje ID:', anaProjeId);
        setLoading(false);
        return;
      }

      // Ana proje bilgilerini al
      const { data: anaProjeData, error: anaProjeError } = await supabase
        .from('projeler')
        .select('id, proje_adi, aciklama, durum')
        .eq('id', anaProjeIdInt)
        .maybeSingle();

      if (anaProjeError || !anaProjeData) {
        console.error('❌ Ana proje bulunamadı:', anaProjeError?.message);
        setLoading(false);
        return;
      }

      console.log('✅ Ana proje yüklendi:', anaProjeData.proje_adi);

      if (isMountedRef.current) {
        setAnaProje({
          id: anaProjeData.id,
          projeAdi: anaProjeData.proje_adi || 'İsimsiz Proje',
          aciklama: anaProjeData.aciklama || '',
          durum: anaProjeData.durum || 'Aktif',
        });
      }

      // Alt projeleri al
      const { data: altProjelerData, error: altProjelerError } = await supabase
        .from('alt_projeler')
        .select(`
          id,
          alt_proje_adi,
          aciklama,
          durum,
          baslangic_tarihi,
          bitis_tarihi,
          ana_proje_id
        `)
        .eq('ana_proje_id', anaProjeIdInt)
        .order('id', { ascending: false });

      if (altProjelerError || !altProjelerData) {
        console.warn('⚠️ Alt proje bulunamadı:', altProjelerError?.message);
        if (isMountedRef.current) {
          setAltProjeler([]);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Alt projeler yüklendi:', altProjelerData.length);

      // Alt projelere görev istatistiklerini ekle
      const altProjelerWithStats = await Promise.all(
        altProjelerData.map(async (altProje) => {
          try {
            const { data: gorevlerData } = await supabase
              .from('gorevler')
              .select('id, durum, atanan_firmalar')
              .eq('alt_proje_id', altProje.id);

            let toplamGorevSayisi = 0;
            let tamamlananGorevSayisi = 0;

            if (gorevlerData && Array.isArray(gorevlerData)) {
              const firmaGorevleri = gorevlerData.filter((gorev) => {
                if (!gorev.atanan_firmalar) return false;

                try {
                  let atananFirmalar = [];
                  if (Array.isArray(gorev.atanan_firmalar)) {
                    atananFirmalar = gorev.atanan_firmalar;
                  } else if (typeof gorev.atanan_firmalar === 'string') {
                    atananFirmalar = JSON.parse(gorev.atanan_firmalar);
                  }
                  return Array.isArray(atananFirmalar) && atananFirmalar.includes(currentFirmaId);
                } catch {
                  return false;
                }
              });

              toplamGorevSayisi = firmaGorevleri.length;

              // Tamamlanan görevleri say
              for (const gorev of firmaGorevleri) {
                const { data: tamamlamaTalebi } = await supabase
                  .from('gorev_tamamlama_talepleri')
                  .select('durum')
                  .eq('gorev_id', gorev.id)
                  .eq('firma_id', currentFirmaId)
                  .eq('durum', 'Onaylandı')
                  .maybeSingle();

                if (tamamlamaTalebi) {
                  tamamlananGorevSayisi++;
                }
              }
            }

            const ilerlemeyuzdesi = toplamGorevSayisi > 0
              ? Math.round((tamamlananGorevSayisi / toplamGorevSayisi) * 100)
              : 0;

            return {
              id: altProje.id,
              altProjeAdi: altProje.alt_proje_adi || 'İsimsiz Alt Proje',
              aciklama: altProje.aciklama || '',
              durum: altProje.durum || 'Aktif',
              baslangicTarihi: altProje.baslangic_tarihi || '',
              bitisTarihi: altProje.bitis_tarihi || '',
              yuzde_tamamlanma: ilerlemeyuzdesi,
              toplamGorevSayisi: toplamGorevSayisi,
              tamamlananGorevSayisi: tamamlananGorevSayisi,
              anaProjeId: altProje.ana_proje_id,
            };

          } catch (error) {
            console.error('❌ Alt proje istatistik hatası:', error);
            return {
              id: altProje.id,
              altProjeAdi: altProje.alt_proje_adi || 'İsimsiz Alt Proje',
              aciklama: altProje.aciklama || '',
              durum: 'Aktif',
              baslangicTarihi: altProje.baslangic_tarihi || '',
              bitisTarihi: altProje.bitis_tarihi || '',
              yuzde_tamamlanma: 0,
              toplamGorevSayisi: 0,
              tamamlananGorevSayisi: 0,
              anaProjeId: altProje.ana_proje_id,
            };
          }
        }),
      );

      if (isMountedRef.current) {
        setAltProjeler(altProjelerWithStats);
      }

    } catch (error) {
      console.error('❌ Alt projeler yükleme hatası:', error);
      if (isMountedRef.current) {
        setAltProjeler([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    filterAltProjeler();
  }, [activeFilter, searchQuery, altProjeler]);

  const filterAltProjeler = () => {
    let filtered = altProjeler;

    if (activeFilter !== 'hepsi') {
      filtered = filtered.filter((altProje) =>
        altProje.durum.toLowerCase().includes(activeFilter.toLowerCase()),
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (altProje) =>
          altProje.altProjeAdi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          altProje.aciklama.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredAltProjeler(filtered);
  };

  // ✅ YENİ ve GÜVENLİ Alt Proje Detay Yönlendirme Fonksiyonu
  const handleGorevlereGit = (altProje: AltProje) => {
    console.log('🚀 Alt proje görevlerine yönlendirme başlatılıyor:', {
      alt_proje_id: altProje.id,
      alt_proje_adi: altProje.altProjeAdi,
    });

    try {
      // 1. Mevcut auth verilerini kontrol et
      if (!firmaId || !firmaAdi || !userEmail) {
        console.error('❌ Auth verileri eksik!');
        alert('Oturum bilgileri eksik. Lütfen tekrar giriş yapın.');
        router.push('/login');
        return;
      }

      // 2. Auth verilerini güçlendir ve koru
      const currentTime = new Date().toISOString();

      // Ana storage kayıt (güvenlik için çoklu kayıt)
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('firmaId', firmaId.toString());
      localStorage.setItem('firmaAdi', firmaAdi);
      localStorage.setItem('loginTimestamp', currentTime);
      localStorage.setItem('lastActivity', currentTime);

      // Session backup
      sessionStorage.setItem('userSession', JSON.stringify({
        isLoggedIn: true,
        userEmail: userEmail,
        firmaId: firmaId,
        firmaAdi: firmaAdi,
        timestamp: currentTime
      }));

      console.log('✅ Auth verileri korundu:', {
        firmaId: firmaId,
        firmaAdi: firmaAdi,
        userEmail: userEmail
      });

      // 3. Yönlendirme yap
      const targetUrl = `/alt-proje-detay/${altProje.id}`;
      console.log('✅ Yönlendirme:', targetUrl);

      router.push(targetUrl);

    } catch (error) {
      console.error('❌ Yönlendirme hatası:', error);
      alert('Sayfa yönlendirmesinde hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Tamamlandı':
        return 'bg-green-100 text-green-800';
      case 'Devam Ediyor':
      case 'Aktif':
        return 'bg-blue-100 text-blue-800';
      case 'Planlama':
        return 'bg-yellow-100 text-yellow-800';
      case 'Beklemede':
      case 'Pasif':
        return 'bg-gray-100 text-gray-800';
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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loading || !mounted) {
    return (
      <ModernLayout userEmail={'user@example.com'} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Alt projeler yükleniyor...</p>
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
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  const filterCounts = {
    hepsi: altProjeler.length,
    'devam ediyor': altProjeler.filter((p) => p.durum === 'Devam Ediyor' || p.durum === 'Aktif').length,
    'tamamlandı': altProjeler.filter((p) => p.durum === 'Tamamlandı').length,
    'beklemede': altProjeler.filter((p) => p.durum === 'Beklemede' || p.durum === 'Pasif').length,
  };

  return (
    <ModernLayout userEmail={userEmail} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <i className="ri-folder-2-line text-white text-2xl"></i>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{altProjeler.length}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Link href="/projelerim" className="text-gray-500 hover:text-blue-600 transition-colors cursor-pointer">
                      Projelerim
                    </Link>
                    <i className="ri-arrow-right-s-line text-gray-400"></i>
                    <span className="text-blue-600 font-medium">{anaProje?.projeAdi}</span>
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
                    Alt Projeler 📂
                  </h1>
                  <p className="text-gray-600 text-lg mb-2">{anaProje?.projeAdi} projesinin alt proje modülleri</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2 text-blue-600 font-medium">
                      <i className="ri-building-line"></i>
                      <span>{firmaAdi}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-purple-600 font-medium">
                      <i className="ri-folder-2-line"></i>
                      <span>{altProjeler.length} Alt Proje</span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-600 font-medium">
                      <i className="ri-check-line"></i>
                      <span>{filterCounts.tamamlandı} Tamamlandı</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* İlerleme Çubuğu */}
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-1000 relative"
                  style={{ width: `${Math.min((filterCounts.tamamlandı / Math.max(altProjeler.length, 1)) * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Başlangıç</span>
                <span className="font-medium">%{Math.round((filterCounts.tamamlandı / Math.max(altProjeler.length, 1)) * 100)} tamamlandı</span>
                <span>Hedef: Tüm Alt Projeler</span>
              </div>
            </div>
          </div>

          {/* Filtre ve Arama */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="ri-search-line text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Alt proje ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm bg-white/80 backdrop-blur"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {[{
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
                },
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

        {/* Alt Projeler Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAltProjeler.map((altProje) => (
            <div
              key={altProje.id}
              className="group bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              {/* Alt Proje Header */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDurumColor(altProje.durum)}`}>
                      {altProje.durum}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-full">
                    #{altProje.id}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {altProje.altProjeAdi}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {altProje.aciklama}
                </p>

                {/* Görev İstatistikleri */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center bg-white/60 backdrop-blur rounded-lg p-3 group-hover:bg-white/80 transition-colors">
                    <div className="text-lg font-bold text-green-600">1</div>
                    <div className="text-xs text-gray-600">Alt Proje</div>
                  </div>
                  <div className="text-center bg-white/60 backdrop-blur rounded-lg p-3 group-hover:bg-white/80 transition-colors">
                    <div className="text-lg font-bold text-orange-600">{altProje.toplamGorevSayisi}</div>
                    <div className="text-xs text-gray-600">Görev</div>
                  </div>
                </div>
              </div>

              {/* Alt Proje Body */}
              <div className="p-6 space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">İlerleme</span>
                    <span className="text-sm font-bold text-gray-900">{altProje.yuzde_tamamlanma}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${getIlerlemeRenk(altProje.yuzde_tamamlanma)} transition-all duration-700 relative`}
                      style={{ width: `${altProje.yuzde_tamamlanma}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Görev Durumu */}
                <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Görev Durumu</span>
                    <span className="text-sm font-bold text-green-600">
                      {altProje.tamamlananGorevSayisi}/{altProje.toplamGorevSayisi}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-green-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${altProje.toplamGorevSayisi > 0 ? (altProje.tamamlananGorevSayisi / altProje.toplamGorevSayisi) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {altProje.toplamGorevSayisi > 0 ? Math.round((altProje.tamamlananGorevSayisi / altProje.toplamGorevSayisi) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Tarih Aralığı */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-green-600">
                    <i className="ri-calendar-line"></i>
                    <span>{formatDate(altProje.baslangicTarihi)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <i className="ri-flag-line"></i>
                    <span>{formatDate(altProje.bitisTarihi)}</span>
                  </div>
                </div>
              </div>

              {/* Alt Proje Footer - ✅ GÖREVLERE GİT BUTONU */}
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-green-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Ana Proje: {anaProje?.projeAdi}
                  </span>
                  <button
                    onClick={() => handleGorevlereGit(altProje)}
                    className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800 transition-colors cursor-pointer group"
                  >
                    <i className="ri-task-line"></i>
                    <span>Görevlere Git</span>
                    <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAltProjeler.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-folder-2-line text-green-500 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Bu kategoride alt proje bulunmuyor'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery
                ? `"${searchQuery}" araması için sonuç bulunamadı. Farklı kelimeler deneyin.`
                : `${activeFilter} durumunda alt proje bulunmuyor.`}
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

        {/* İstatistikler Footer */}
        {filteredAltProjeler.length > 0 && (
          <div className="bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center">
                <i className="ri-bar-chart-line text-white"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold">Alt Proje İstatistikleri</h3>
                <p className="text-white/80 text-sm">Ana proje: {anaProje?.projeAdi}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {filteredAltProjeler.length}
                </div>
                <div className="text-sm text-white/80">Alt Proje</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {filteredAltProjeler.reduce((sum, p) => sum + p.toplamGorevSayisi, 0)}
                </div>
                <div className="text-sm text-white/80">Toplam Görev</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {filteredAltProjeler.reduce((sum, p) => sum + p.tamamlananGorevSayisi, 0)}
                </div>
                <div className="text-sm text-white/80">Tamamlanan</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round(
                    filteredAltProjeler.reduce((sum, p) => sum + p.yuzde_tamamlanma, 0) / Math.max(filteredAltProjeler.length, 1),
                  )}%{' '}
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
