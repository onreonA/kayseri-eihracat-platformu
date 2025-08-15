
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModernLayout from '../../components/Layout/ModernLayout';
import { DestekDokümanlarıService, LoginSyncService } from '@/lib/supabase-services';
import { useToast } from '@/components/ui/Toast';

// ULTIMATE FIX: Enhanced Doküman Interface
interface DestekDokümanları {
  ID: number;
  BelgeAdı: string;
  BelgeURL: string;
  Açıklama: string;
  Kategori: 'B2B Rehber' | 'B2C Kılavuz' | 'Teşvik Form' | 'Genel Bilgi';
  YuklemeTarihi: string | Date;
  Durum?: string;
}

// ENHANCED: Stats Component
const DestekStats = ({ dokümanlar }: { dokümanlar: DestekDokümanları[] }) => {
  const stats = {
    toplam: dokümanlar.length,
    b2bRehber: dokümanlar.filter(d => d.Kategori === 'B2B Rehber').length,
    b2cKilavuz: dokümanlar.filter(d => d.Kategori === 'B2C Kılavuz').length,
    tesvikForm: dokümanlar.filter(d => d.Kategori === 'Teşvik Form').length,
    genelBilgi: dokümanlar.filter(d => d.Kategori === 'Genel Bilgi').length,
  };

  const statCards = [
    { label: 'Toplam Doküman', value: stats.toplam, icon: 'ri-file-text-line', color: 'from-blue-500 to-blue-600' },
    { label: 'B2B Rehber', value: stats.b2bRehber, icon: 'ri-building-line', color: 'from-green-500 to-green-600' },
    { label: 'B2C Kılavuz', value: stats.b2cKilavuz, icon: 'ri-shopping-cart-line', color: 'from-purple-500 to-purple-600' },
    { label: 'Teşvik Formu', value: stats.tesvikForm, icon: 'ri-file-copy-line', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div key={index} className="group">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${stat.color} group-hover:scale-110 transition-transform`}>
                <i className={`${stat.icon} text-white text-xl`}></i>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function DestekMerkeziPage() {
  const [userData, setUserData] = useState<{ email: string; firmaAdi: string; firmaId: number } | null>(null);
  const [dokümanlar, setDokümanlar] = useState<DestekDokümanları[]>([]);
  const [filteredDokümanlar, setFilteredDokümanlar] = useState<DestekDokümanları[]>([]);
  const [selectedKategori, setSelectedKategori] = useState<string>('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500;

  const { addToast, ToastContainer } = useToast();

  const kategoriler = ['Tümü', 'B2B Rehber', 'B2C Kılavuz', 'Teşvik Form', 'Genel Bilgi'];

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
        console.log('DESTEK MERKEZİ: Güvenli auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log('Destek Merkezi auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
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
                console.log('Destek Merkezi: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  setTimeout(() => {
                    router.push('/login');
                  }, 800);
                }
                return;
              }

              if (isMountedRef.current) {
                console.log('Destek Merkezi: Unified format auth başarılı');
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
            console.warn('Destek Merkezi: Unified data parse hatası:', parseError);
          }
        }

        // Legacy format kontrolü (geriye uyumluluk)
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userEmail = localStorage.getItem('userEmail');
        const firmaAdi = localStorage.getItem('firmaAdi');
        const firmaId = localStorage.getItem('firmaId');

        console.log('Destek Merkezi legacy kontrol:', { isLoggedIn, email: !!userEmail, firma: !!firmaAdi, id: !!firmaId });

        if (!isLoggedIn || isLoggedIn !== 'true' || !userEmail || !firmaAdi) {
          console.log('Destek Merkezi: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log('Destek Merkezi: Legacy format auth başarılı');
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
        console.error('Destek Merkezi auth kontrol hatası:', error);
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
      loadDokümanlar();

      // Real-time clock update
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [mounted, userData, initialCheckDone]);

  // Filter and search effect
  useEffect(() => {
    filterDokümanlar();
  }, [dokümanlar, selectedKategori, searchTerm]);

  const loadDokümanlar = async () => {
    try {
      setLoading(true);
      console.log('ENHANCED: User destek dokümanları yükleniyor...');

      const data = await DestekDokümanlarıService.getAllDokümanlar();

      // Sadece aktif dokümanları göster
      const aktivDokümanlar = data.filter(dok => !dok.Durum || dok.Durum === 'Aktif');

      console.log('User dokümanlar yüklendi:', aktivDokümanlar.length);

      setDokümanlar(aktivDokümanlar);
      addToast({ message: `${aktivDokümanlar.length} doküman yüklendi`, type: 'success' });
    } catch (error) {
      console.error('Dokümanlar yükleme hatası:', error);
      addToast({ message: 'Dokümanlar yüklenirken hata oluştu', type: 'error' });
      setDokümanlar([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDokümanlar = () => {
    let filtered = [...dokümanlar];

    // Kategori filtresi
    if (selectedKategori !== 'Tümü') {
      filtered = filtered.filter(dok => dok.Kategori === selectedKategori);
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(dok =>
        dok.BelgeAdı.toLowerCase().includes(search) ||
        dok.Açıklama.toLowerCase().includes(search) ||
        dok.Kategori.toLowerCase().includes(search)
      );
    }

    // Tarihe göre sırala (en yeni ilk)
    filtered.sort((a, b) => {
      const dateA = new Date(a.YuklemeTarihi).getTime();
      const dateB = new Date(b.YuklemeTarihi).getTime();
      return dateB - dateA;
    });

    setFilteredDokümanlar(filtered);
  };

  const handleDownload = async (belgeURL: string, belgeAdi: string) => {
    try {
      console.log('Dosya indiriliyor:', { belgeURL, belgeAdi });

      // Basit download handling
      const link = document.createElement('a');
      link.href = belgeURL;
      link.download = belgeAdi;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Dosya indirme işlemi
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // İndirme geçmişi kaydı (opsiyonel - gelecekteki geliştirme için)
      console.log('İndirme kaydedildi:', {
        belgeAdi,
        firmaId: userData?.firmaId,
        indirmeTarihi: new Date().toISOString()
      });

    } catch (error) {
      console.error('İndirme hatası:', error);
      addToast({ message: 'Dosya indirilemedi', type: 'error' });
    }
  };

  const getKategoriIcon = (kategori: string) => {
    switch (kategori) {
      case 'B2B Rehber':
        return 'ri-building-line';
      case 'B2C Kılavuz':
        return 'ri-shopping-cart-line';
      case 'Teşvik Form':
        return 'ri-file-text-line';
      case 'Genel Bilgi':
        return 'ri-information-line';
      default:
        return 'ri-file-line';
    }
  };

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'B2B Rehber':
        return 'bg-blue-100 text-blue-800';
      case 'B2C Kılavuz':
        return 'bg-green-100 text-green-800';
      case 'Teşvik Form':
        return 'bg-purple-100 text-purple-800';
      case 'Genel Bilgi':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Anti-Loop Loading State
  if (!mounted || loading || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Destek Merkezi yükleniyor...</p>
          <p className="text-gray-500 text-sm mt-2">Anti-Loop Koruma Aktif - Kısır döngü koruması çalışıyor</p>
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
        {/* Modern Hero Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="ri-customer-service-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Destek Merkezi
                  </h1>
                  <p className="text-gray-600">E-ihracat sürecinizde size yardımcı olacak dokümanlar ve rehberler</p>
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
                <span className="text-sm text-gray-600">Çevrimiçi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <DestekStats dokümanlar={dokümanlar} />

        {/* Modern Search and Filter */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-search-line text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Doküman ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {kategoriler.map((kategori) => (
                <button
                  key={kategori}
                  onClick={() => setSelectedKategori(kategori)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 whitespace-nowrap cursor-pointer transform hover:scale-105 ${
                    selectedKategori === kategori
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white/70 text-gray-700 hover:bg-white/90 border border-gray-200'
                  }`}
                >
                  {kategori}
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredDokümanlar.length} / {dokümanlar.length} doküman gösteriliyor
              {selectedKategori !== 'Tümü' && ` (${selectedKategori})`}
              {searchTerm && ` - "${searchTerm}" için arama sonuçları`}
            </span>
            {(selectedKategori !== 'Tümü' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedKategori('Tümü');
                  setSearchTerm('');
                }}
                className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Dokümanlar yükleniyor...</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDokümanlar.map((dokuman) => (
              <div key={dokuman.ID} className="group">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <i className={`${getKategoriIcon(dokuman.Kategori)} text-blue-600 text-xl`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{dokuman.BelgeAdı}</h3>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getKategoriColor(dokuman.Kategori)} mb-3`}>
                        {dokuman.Kategori}
                      </span>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{dokuman.Açıklama}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(dokuman.YuklemeTarihi).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <button
                          onClick={() => handleDownload(dokuman.BelgeURL, dokuman.BelgeAdı)}
                          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm whitespace-nowrap cursor-pointer transform hover:scale-105 shadow-lg"
                        >
                          <i className="ri-download-line"></i>
                          <span>İndir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDokümanlar.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-search-line text-gray-400 text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || selectedKategori !== 'Tümü'
                ? 'Arama kriterlerinize uygun doküman bulunamadı'
                : 'Henüz doküman bulunmuyor'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || selectedKategori !== 'Tümü'
                ? 'Farklı arama terimleri veya filtreler deneyebilirsiniz.'
                : 'Dokümanlar yüklendikten sonra burada görüntülenecektir.'}
            </p>
            {(searchTerm || selectedKategori !== 'Tümü') && (
              <button
                onClick={() => {
                  setSelectedKategori('Tümü');
                  setSearchTerm('');
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-lg"
              >
                Tüm Dokümanları Göster
              </button>
            )}
          </div>
        )}

        {/* Modern Help Section */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-customer-service-2-line text-3xl"></i>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">Daha fazla yardıma mı ihtiyacınız var?</h2>
            <p className="text-blue-100 mb-8 text-lg leading-relaxed">
              Dokümanlarımızda aradığınızı bulamadıysanız, uzman ekibimizden birebir danışmanlık alabilirsiniz.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/randevu-talebi"
                className="bg-white/20 backdrop-blur-lg text-white px-6 py-4 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 whitespace-nowrap cursor-pointer inline-flex items-center justify-center space-x-2 transform hover:scale-105 border border-white/20"
              >
                <i className="ri-calendar-line text-xl"></i>
                <span>Randevu Talep Et</span>
              </Link>
              <Link
                href="/egitimlerim"
                className="bg-white text-blue-600 px-6 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 whitespace-nowrap cursor-pointer inline-flex items-center justify-center space-x-2 transform hover:scale-105 shadow-lg"
              >
                <i className="ri-play-circle-line text-xl"></i>
                <span>Eğitimleri İzle</span>
              </Link>
              <Link
                href="/forum"
                className="bg-transparent border-2 border-white/30 text-white px-6 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 whitespace-nowrap cursor-pointer inline-flex items-center justify-center space-x-2 transform hover:scale-105"
              >
                <i className="ri-discuss-line text-xl"></i>
                <span>Forum'a Katıl</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
