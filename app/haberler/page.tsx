
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-services';
import ModernLayout from '../../components/Layout/ModernLayout';
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
  okundu?: boolean;
}

interface HaberStats {
  toplam: number;
  okunmamis: number;
  bu_hafta: number;
}

export default function HaberlerPage() {
  const [userData, setUserData] = useState<{ email: string; firmaAdi: string; firmaId: number } | null>(null);
  const [haberler, setHaberler] = useState<Haber[]>([]);
  const [filteredHaberler, setFilteredHaberler] = useState<Haber[]>([]);
  const [stats, setStats] = useState<HaberStats>({ toplam: 0, okunmamis: 0, bu_hafta: 0 });
  const [selectedTur, setSelectedTur] = useState<string>('Tümü');
  const [selectedEtiket, setSelectedEtiket] = useState<string>('Tümü');
  const [tarihFiltresi, setTarihFiltresi] = useState<string>('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedHaber, setSelectedHaber] = useState<Haber | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [availableEtiketler, setAvailableEtiketler] = useState<string[]>([]);

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500;

  const { addToast, ToastContainer } = useToast();

  const turler = [
    { key: 'Tümü', label: 'Tümü', icon: 'ri-apps-line', color: 'from-gray-500 to-gray-600' },
    { key: 'duyuru', label: 'Duyuru', icon: 'ri-megaphone-line', color: 'from-red-500 to-red-600' },
    { key: 'haber', label: 'Haber', icon: 'ri-newspaper-line', color: 'from-blue-500 to-blue-600' },
    { key: 'danisan_notu', label: 'Danışman Notu', icon: 'ri-user-star-line', color: 'from-purple-500 to-purple-600' }
  ];

  // Anti-Loop Mount Effect
  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, []);

  // Anti-Loop Auth Check Effect
  useEffect(() => {
    if (!mounted || initialCheckDone || redirectRef.current) return;

    const performSafeAuthCheck = () => {
      try {
        console.log('📰 HABERLER: Güvenli auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log('📰 Haberler auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
          setInitialCheckDone(true);
          setLoading(false);
          return;
        }
        lastAuthCheck.current = now;

        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

        // Unified format kontrolü (öncelikli)
        const unifiedData = localStorage.getItem('user_login_data');
        if (unifiedData) {
          try {
            const parsedData = JSON.parse(unifiedData);
            const isValid = parsedData.email && parsedData.firmaAdi && parsedData.loginTime;

            if (isValid) {
              const loginTime = new Date(parsedData.loginTime);
              const now = new Date();
              const timeDiff = now.getTime() - loginTime.getTime();
              const hoursDiff = timeDiff / (1000 * 3600);

              if (hoursDiff > 24) {
                console.log('⏰ Haberler: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  setTimeout(() => {
                    router.push('/login');
                  }, 800);
                }
                return;
              }

              if (isMountedRef.current) {
                console.log('✅ Haberler: Unified format auth başarılı');
                const userData = {
                  email: parsedData.email,
                  firmaAdi: parsedData.firmaAdi,
                  firmaId: parsedData.firmaId || 0
                };
                setUserData(userData);
                setInitialCheckDone(true);
                setLoading(false);
              }
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ Haberler: Unified data parse hatası:', parseError);
          }
        }

        // Legacy format kontrolü (geriye uyumluluk)
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userEmail = localStorage.getItem('userEmail');
        const firmaAdi = localStorage.getItem('firmaAdi');
        const firmaId = localStorage.getItem('firmaId');

        console.log('🔄 Haberler legacy kontrol:', { isLoggedIn, email: !!userEmail, firma: !!firmaAdi, id: !!firmaId });

        if (!isLoggedIn || isLoggedIn !== 'true' || !userEmail || !firmaAdi) {
          console.log('❌ Haberler: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log('✅ Haberler: Legacy format auth başarılı');
          const userData = {
            email: userEmail,
            firmaAdi: firmaAdi,
            firmaId: parseInt(firmaId || '0') || 0
          };
          setUserData(userData);
          setInitialCheckDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Haberler auth kontrol hatası:', error);
        if (isMountedRef.current) {
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    // 4 saniye gecikme ile auth kontrolü başlat
    authCheckTimeoutRef.current = setTimeout(performSafeAuthCheck, 4000);

    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [mounted, initialCheckDone, router]);

  // Data loading effect
  useEffect(() => {
    if (mounted && userData && initialCheckDone) {
      loadHaberler();

      // Real-time clock update
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [mounted, userData, initialCheckDone]);

  // Filter effect
  useEffect(() => {
    filterHaberler();
  }, [haberler, selectedTur, selectedEtiket, tarihFiltresi, searchTerm]);

  const loadHaberler = async () => {
    try {
      setLoading(true);
      console.log('📰 Kullanıcı haberleri yükleniyor...');

      // Yayında olan haberleri çek
      const { data: haberlerData, error: haberlerError } = await supabase
        .from('haberler')
        .select(`
          *,
          haber_istatistikleri (
            toplam_okuma
          )
        `)
        .eq('durum', 'yayinda')
        .order('yayin_tarihi', { ascending: false });

      if (haberlerError) throw haberlerError;

      // Kullanıcının okuma kayıtlarını çek
      const { data: okumaKayitlari, error: okumaError } = await supabase
        .from('haber_okuma_kayitlari')
        .select('haber_id')
        .eq('firma_id', userData?.firmaId);

      if (okumaError && okumaError.code !== 'PGRST116') {
        console.warn('Okuma kayıtları yüklenemedi:', okumaError);
      }

      const okunmusIds = new Set((okumaKayitlari || []).map(k => k.haber_id));

      // Haberleri okundu bilgisi ile birleştir
      const haberlerWithReadStatus = (haberlerData || []).map(haber => ({
        ...haber,
        okundu: okunmusIds.has(haber.id)
      }));

      setHaberler(haberlerWithReadStatus);

      // Mevcut etiketleri çıkar
      const etiketler = new Set<string>();
      haberlerWithReadStatus.forEach(haber => {
        if (haber.etiketler) {
          haber.etiketler.forEach(etiket => etiketler.add(etiket));
        }
      });
      setAvailableEtiketler(Array.from(etiketler));

      // İstatistikleri hesapla
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newStats = {
        toplam: haberlerWithReadStatus.length,
        okunmamis: haberlerWithReadStatus.filter(h => !h.okundu).length,
        bu_hafta: haberlerWithReadStatus.filter(h => new Date(h.yayin_tarihi) >= oneWeekAgo).length
      };

      setStats(newStats);

      console.log('✅ Haberler yüklendi:', haberlerWithReadStatus.length);

    } catch (error) {
      console.error('📰 Haberler yükleme hatası:', error);
      addToast({ message: 'Haberler yüklenirken hata oluştu', type: 'error' });
      setHaberler([]);
    } finally {
      setLoading(false);
    }
  };

  const filterHaberler = () => {
    let filtered = [...haberler];

    // Tür filtresi
    if (selectedTur !== 'Tümü') {
      filtered = filtered.filter(haber => haber.haber_turu === selectedTur);
    }

    // Etiket filtresi
    if (selectedEtiket !== 'Tümü') {
      filtered = filtered.filter(haber => 
        haber.etiketler && haber.etiketler.includes(selectedEtiket)
      );
    }

    // Tarih filtresi
    if (tarihFiltresi !== 'Tümü') {
      const now = new Date();
      let startDate: Date;

      switch (tarihFiltresi) {
        case 'bu_hafta':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'bu_ay':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'gecen_ay':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          filtered = filtered.filter(haber => {
            const haberDate = new Date(haber.yayin_tarihi);
            return haberDate >= startDate && haberDate <= endDate;
          });
          break;
        default:
          startDate = new Date(0);
      }

      if (tarihFiltresi !== 'gecen_ay') {
        filtered = filtered.filter(haber => new Date(haber.yayin_tarihi) >= startDate);
      }
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(haber =>
        haber.baslik.toLowerCase().includes(search) ||
        (haber.kisa_aciklama && haber.kisa_aciklama.toLowerCase().includes(search)) ||
        (haber.etiketler && haber.etiketler.some(etiket => 
          etiket.toLowerCase().includes(search)
        ))
      );
    }

    setFilteredHaberler(filtered);
  };

  const handleHaberOku = async (haber: Haber) => {
    if (!userData) return;

    try {
      // Haber detayını göster
      setSelectedHaber(haber);
      setShowDetailModal(true);

      // Eğer daha önce okunmamışsa okuma kaydı oluştur
      if (!haber.okundu) {
        const { error } = await supabase
          .from('haber_okuma_kayitlari')
          .insert([{
            haber_id: haber.id,
            kullanici_id: userData.firmaId, // Geçici olarak firma_id kullanıyoruz
            firma_id: userData.firmaId,
            okuma_tarihi: new Date().toISOString()
          }]);

        if (error && error.code !== '23505') { // Unique constraint error ignore
          console.warn('Okuma kaydı oluşturulamadı:', error);
        } else {
          // İstatistikleri güncelle
          await supabase.rpc('increment_haber_stats', { 
            haber_id: haber.id 
          });

          // Local state'i güncelle
          setHaberler(prev => 
            prev.map(h => 
              h.id === haber.id ? { ...h, okundu: true } : h
            )
          );

          // Stats'ı güncelle
          setStats(prev => ({
            ...prev,
            okunmamis: Math.max(0, prev.okunmamis - 1)
          }));
        }
      }

    } catch (error) {
      console.error('Haber okuma hatası:', error);
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

  const getTurGradient = (tur: string) => {
    const turData = turler.find(t => t.key === tur);
    return turData ? turData.color : 'from-gray-500 to-gray-600';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now.getTime() - time.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays > 0) return `${diffInDays} gün önce`;
    if (diffInHours > 0) return `${diffInHours} saat önce`;
    return 'Şimdi';
  };

  const extractYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  // Anti-Loop Loading State
  if (!mounted || loading || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Haberler yükleniyor...</p>
          <p className="text-gray-500 text-sm mt-2">Anti-Loop Koruma Aktif</p>
        </div>
      </div>
    );
  }

  // Anti-Loop Auth Failed State
  if (!userData) {
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

  return (
    <ModernLayout userEmail={userData.email} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <ToastContainer />

      <div className="p-6 lg:p-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="ri-newspaper-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Haberler & Bülten 📰
                  </h1>
                  <p className="text-gray-600">E-ihracat dünyasından en güncel haberler ve duyurular</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Canlı</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 group hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-newspaper-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.toplam}</p>
                <p className="text-sm text-gray-600">Toplam Haber</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full w-full transition-all duration-1000"></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 group hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-notification-badge-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">{stats.okunmamis}</p>
                <p className="text-sm text-gray-600">Okunmamış</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${stats.toplam > 0 ? (stats.okunmamis / stats.toplam) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 group hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-time-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{stats.bu_hafta}</p>
                <p className="text-sm text-gray-600">Bu Hafta</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${stats.toplam > 0 ? (stats.bu_hafta / stats.toplam) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-search-line text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Haberlerde ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
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

              <select
                value={selectedEtiket}
                onChange={(e) => setSelectedEtiket(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="Tümü">Tüm Etiketler</option>
                {availableEtiketler.map(etiket => (
                  <option key={etiket} value={etiket}>{etiket}</option>
                ))}
              </select>

              <select
                value={tarihFiltresi}
                onChange={(e) => setTarihFiltresi(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="Tümü">Tüm Zamanlar</option>
                <option value="bu_hafta">Bu Hafta</option>
                <option value="bu_ay">Bu Ay</option>
                <option value="gecen_ay">Geçen Ay</option>
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredHaberler.length} / {haberler.length} haber gösteriliyor
              {selectedTur !== 'Tümü' && ` (${selectedTur})`}
              {selectedEtiket !== 'Tümü' && ` - ${selectedEtiket}`}
              {searchTerm && ` - "${searchTerm}"`}
            </span>
            {(selectedTur !== 'Tümü' || selectedEtiket !== 'Tümü' || tarihFiltresi !== 'Tümü' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedTur('Tümü');
                  setSelectedEtiket('Tümü');
                  setTarihFiltresi('Tümü');
                  setSearchTerm('');
                }}
                className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>

        {/* News Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Haberler yükleniyor...</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHaberler.map((haber) => (
              <div key={haber.id} className="group cursor-pointer" onClick={() => handleHaberOku(haber)}>
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1">
                  {/* Haber Görseli */}
                  {haber.gorsel_url && (
                    <div className="mb-4 overflow-hidden rounded-xl">
                      <img
                        src={haber.gorsel_url}
                        alt={haber.baslik}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTurColor(haber.haber_turu)}`}>
                          {haber.haber_turu === 'duyuru' ? 'Duyuru' :
                           haber.haber_turu === 'haber' ? 'Haber' : 'Danışman Notu'}
                        </span>
                        {!haber.okundu && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" title="Okunmamış"></div>
                        )}
                      </div>
                    </div>

                    <h3 className={`text-lg font-bold line-clamp-2 transition-colors ${haber.okundu ? 'text-gray-700' : 'text-gray-900'}`}>
                      {haber.baslik}
                    </h3>

                    {haber.kisa_aciklama && (
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {haber.kisa_aciklama}
                      </p>
                    )}

                    {/* Etiketler */}
                    {haber.etiketler && haber.etiketler.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {haber.etiketler.slice(0, 3).map((etiket, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            #{etiket}
                          </span>
                        ))}
                        {haber.etiketler.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{haber.etiketler.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <i className="ri-calendar-line"></i>
                        <span>{formatTimeAgo(haber.yayin_tarihi)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-blue-600 group-hover:text-blue-700">
                        <span className="font-medium">Devamını Oku</span>
                        <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredHaberler.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-newspaper-line text-gray-400 text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || selectedTur !== 'Tümü' || selectedEtiket !== 'Tümü' || tarihFiltresi !== 'Tümü'
                ? 'Filtreye uygun haber bulunamadı'
                : 'Henüz haber yok'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || selectedTur !== 'Tümü' || selectedEtiket !== 'Tümü' || tarihFiltresi !== 'Tümü'
                ? 'Farklı filtreler deneyebilir veya arama terimini değiştirebilirsiniz.'
                : 'Yeni haberler yayınlandığında burada görüntülenecektir.'}
            </p>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedHaber && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTurColor(selectedHaber.haber_turu)}`}>
                        {selectedHaber.haber_turu === 'duyuru' ? 'Duyuru' :
                         selectedHaber.haber_turu === 'haber' ? 'Haber' : 'Danışman Notu'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedHaber.yayin_tarihi).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {selectedHaber.baslik}
                    </h2>
                    {selectedHaber.kisa_aciklama && (
                      <p className="text-gray-600 text-lg mb-4">
                        {selectedHaber.kisa_aciklama}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedHaber(null);
                    }}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                  >
                    <i className="ri-close-line text-gray-600"></i>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Görsel */}
                {selectedHaber.gorsel_url && (
                  <div className="mb-6">
                    <img
                      src={selectedHaber.gorsel_url}
                      alt={selectedHaber.baslik}
                      className="w-full max-h-96 object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Video */}
                {selectedHaber.video_url && (
                  <div className="mb-6">
                    {extractYouTubeId(selectedHaber.video_url) ? (
                      <div className="relative pb-56.25 h-0 rounded-xl overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeId(selectedHaber.video_url)}`}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute top-0 left-0 w-full h-full rounded-xl"
                        ></iframe>
                      </div>
                    ) : (
                      <a
                        href={selectedHaber.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        <i className="ri-play-circle-line text-xl"></i>
                        <span>Videoyu İzle</span>
                      </a>
                    )}
                  </div>
                )}

                {/* İçerik */}
                {selectedHaber.detayli_icerik && (
                  <div className="prose prose-lg max-w-none mb-6">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {selectedHaber.detayli_icerik}
                    </div>
                  </div>
                )}

                {/* Etiketler */}
                {selectedHaber.etiketler && selectedHaber.etiketler.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200">
                    <span className="text-sm text-gray-500 mr-2">Etiketler:</span>
                    {selectedHaber.etiketler.map((etiket, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        #{etiket}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
