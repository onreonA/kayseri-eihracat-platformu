
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModernLayout from '../../components/Layout/ModernLayout';
import { supabase } from '@/lib/supabase-services';

interface DashboardStats {
  projelerProgress: number;
  egitimProgress: number;
  forumActivity: number;
  etkinlikKatilim: number;
  totalPuan: number;
  seviye: number;
}

interface RecentActivity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface LeaderboardEntry {
  rank: number;
  firmaAdi: string;
  totalPuan: number;
  projePuan: number;
  egitimPuan: number;
  b2bSatis: number;
  b2cSatis: number;
  badge: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  href: string;
  count?: number;
}

export default function DashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firmaAdi, setFirmaAdi] = useState('');
  const [firmaId, setFirmaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    projelerProgress: 0,
    egitimProgress: 0,
    forumActivity: 0,
    etkinlikKatilim: 0,
    totalPuan: 0,
    seviye: 1,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherInfo, setWeatherInfo] = useState({ temp: '22°C', condition: 'Güneşli' });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2000;

  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/dashboard', active: true },
    { icon: 'ri-project-line', label: 'Projelerim', href: '/projelerim' },
    { icon: 'ri-graduation-cap-line', label: 'Eğitimlerim', href: '/egitimlerim' },
    { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/etkinlikler' },
    { icon: 'ri-discuss-line', label: 'Forum', href: '/forum' },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talebi', href: '/randevu-talebi' },
    { icon: 'ri-file-text-line', label: 'Destek Merkezi', href: '/destek-merkezi' },
    { icon: 'ri-bar-chart-line', label: 'Dönem Raporları', href: '/donem-raporlari' },
    { icon: 'ri-building-line', label: 'Firma Profil', href: '/firma-profil' },
    { icon: 'ri-calendar-line', label: 'Proje Takvimi', href: '/proje-takvimi' },
  ];

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

  useEffect(() => {
    if (!mounted || initialCheckDone || redirectRef.current) return;

    const performSafeAuthCheck = () => {
      try {
        console.log(' DASHBOARD: Güvenli auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log(' Dashboard auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
          setInitialCheckDone(true);
          setLoading(false);
          return;
        }
        lastAuthCheck.current = now;

        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

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
                console.log(' Dashboard: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  router.push('/login');
                }
                return;
              }

              if (isMountedRef.current) {
                console.log(' Dashboard: Unified format auth başarılı');
                setIsLoggedIn(true);
                setFirmaAdi(parsedData.firmaAdi);
                setFirmaId(parsedData.firmaId?.toString() || '');
                setInitialCheckDone(true);
                setLoading(false);
              }
              return;
            }
          } catch (parseError) {
            console.warn(' Dashboard: Unified data parse hatası:', parseError);
          }
        }

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const firma = localStorage.getItem('firmaAdi');
        const id = localStorage.getItem('firmaId');

        console.log(' Dashboard legacy kontrol:', { isLoggedIn, firma: !!firma, id: !!id });

        if (!isLoggedIn || isLoggedIn !== 'true' || !firma) {
          console.log(' Dashboard: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 500);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log(' Dashboard: Legacy format auth başarılı');
          setIsLoggedIn(true);
          setFirmaAdi(firma);
          setFirmaId(id || '');
          setInitialCheckDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error(' Dashboard auth kontrol hatası:', error);
        if (isMountedRef.current) {
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    authCheckTimeoutRef.current = setTimeout(performSafeAuthCheck, 3000);

    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [mounted, initialCheckDone, router]);

  useEffect(() => {
    if (mounted && isLoggedIn) {
      loadDashboardData();

      const timeTimer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timeTimer);
    }
  }, [mounted, isLoggedIn]);

  const loadDashboardData = async () => {
    try {
      const projelerData = JSON.parse(localStorage.getItem('projeler') || '[]');
      const egitimlerData = JSON.parse(localStorage.getItem('egitimler') || '[]');
      const forumData = JSON.parse(localStorage.getItem('forum_konular') || '[]');
      const etkinliklerData = JSON.parse(localStorage.getItem('etkinlikler') || '[]');

      const projePuan = projelerData.length * 50;
      const egitimPuan = egitimlerData.length * 30;
      const forumPuan = forumData.length * 10;
      const totalPuan = projePuan + egitimPuan + forumPuan;
      const seviye = Math.floor(totalPuan / 500) + 1;

      setStats({
        projelerProgress: Math.min(projelerData.length * 25, 100),
        egitimProgress: Math.min(egitimlerData.length * 20, 100),
        forumActivity: Math.min(forumData.length * 15, 100),
        etkinlikKatilim: Math.min(etkinliklerData.length * 30, 100),
        totalPuan,
        seviye,
      });

      setQuickActions([
        {
          id: 'projeler',
          title: 'Aktif Projeler',
          description: `${projelerData.length} proje devam ediyor`,
          icon: 'ri-project-line',
          color: 'from-blue-500 to-blue-600',
          href: '/projelerim',
          count: projelerData.length,
        },
        {
          id: 'egitimler',
          title: 'Eğitim Modülleri',
          description: `${egitimlerData.length} eğitim tamamlandı`,
          icon: 'ri-graduation-cap-line',
          color: 'from-green-500 to-green-600',
          href: '/egitimlerim',
          count: egitimlerData.length,
        },
        {
          id: 'forum',
          title: 'Forum Aktivitesi',
          description: `${forumData.length} konu başlığı`,
          icon: 'ri-discuss-line',
          color: 'from-purple-500 to-purple-600',
          href: '/forum',
          count: forumData.length,
        },
        {
          id: 'etkinlikler',
          title: 'Etkinlikler',
          description: `${etkinliklerData.length} etkinlik`,
          icon: 'ri-calendar-event-line',
          color: 'from-orange-500 to-orange-600',
          href: '/etkinlikler',
          count: etkinliklerData.length,
        },
      ]);

      setRecentActivities([
        {
          id: 1,
          type: 'Proje Güncellemesi',
          message: 'Yeni proje görevi eklendi',
          timestamp: new Date().toISOString(),
          icon: 'ri-project-line',
          color: 'text-blue-600',
        },
        {
          id: 2,
          type: 'Eğitim Tamamlandı',
          message: 'E-ticaret eğitimi başarıyla tamamlandı',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          icon: 'ri-graduation-cap-line',
          color: 'text-green-600',
        },
        {
          id: 3,
          type: 'Forum Mesajı',
          message: 'B2B pazarlama konusunda yeni yanıt',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          icon: 'ri-discuss-line',
          color: 'text-purple-600',
        },
        {
          id: 4,
          type: 'Etkinlik Daveti',
          message: 'İhracat konferansı davetiyesi',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          icon: 'ri-calendar-event-line',
          color: 'text-orange-600',
        },
      ]);

      await loadSupabaseLeaderboard();

      setNotifications([
        {
          id: 1,
          title: 'Yeni Proje Görevi',
          message: 'B2B platform geliştirme görevinde güncelleme',
          time: '2 saat önce',
          type: 'info',
        },
        {
          id: 2,
          title: 'Eğitim Hatırlatması',
          message: 'Dijital pazarlama eğitimine devam etmeyi unutmayın',
          time: '1 gün önce',
          type: 'warning',
        },
        {
          id: 3,
          title: 'Forum Yanıtı',
          message: 'E-ihracat konusundaki soruza yanıt geldi',
          time: '3 gün önce',
          type: 'success',
        },
      ]);
    } catch (error) {
      console.error('Dashboard data loading error:', error);
    }
  };

  const loadSupabaseLeaderboard = async () => {
    try {
      console.log(' Liderlik tablosu için Supabase verilerini yükleniyor...');

      if (!supabase) {
        console.warn(' Supabase bağlantısı yok, varsayılan veriler kullanılacak');
        setDefaultLeaderboard();
        return;
      }

      const { data: firmalarData, error: firmalarError } = await supabase
        .from('firmalar')
        .select(`
          id,
          firma_adi,
          durum,
          created_at
        `)
        .eq('durum', 'Aktif')
        .order('created_at', { ascending: true });

      if (firmalarError) {
        console.error(' Firmalar yüklenirken hata:', firmalarError);
        setDefaultLeaderboard();
        return;
      }

      if (!firmalarData || firmalarData.length === 0) {
        console.log(' Veritabanında aktif firma bulunamadı');
        setDefaultLeaderboard();
        return;
      }

      console.log(` ${firmalarData.length} aktif firma yüklendi`);

      const firmaPerformanslar = await Promise.all(
        firmalarData.map(async (firma: any, index: number) => {
          try {
            const { data: projelerData } = await supabase
              .from('projeler')
              .select('id')
              .contains('hedef_firmalar', [firma.id]);

            const { data: gorevlerData } = await supabase
              .from('gorevler')
              .select('id, durum')
              .contains('atanan_firmalar', [firma.id]);

            const tamamlananGorevler = gorevlerData?.filter((gorev: any) => gorev.durum === 'Tamamlandı' || gorev.durum === 'Tamamlandi') || [];

            const projeSayisi = projelerData?.length || 0;
            const toplamGorevSayisi = gorevlerData?.length || 0;
            const tamamlananGorevSayisi = tamamlananGorevler.length;

            const projePuan = projeSayisi * 100;
            const gorevPuan = tamamlananGorevSayisi * 50;
            const totalPuan = projePuan + gorevPuan + Math.random() * 200;

            const ilerlemePuani = toplamGorevSayisi > 0 ? Math.round((tamamlananGorevSayisi / toplamGorevSayisi) * 100) : Math.floor(Math.random() * 30);

            const isCurrentFirma = firma.firma_adi === firmaAdi;

            return {
              rank: 0,
              firmaAdi: firma.firma_adi,
              totalPuan: isCurrentFirma ? stats.totalPuan : Math.floor(totalPuan),
              projePuan: isCurrentFirma ? toplamGorevSayisi : Math.floor(Math.random() * 1500 + 800),
              egitimPuan: isCurrentFirma ? tamamlananGorevSayisi : Math.floor(Math.random() * 1000 + 600),
              b2bSatis: projeSayisi,
              b2cSatis: Math.floor(Math.random() * 40 + 10),
              badge: '',
              firmaId: firma.id,
              ilerlemePuani: ilerlemePuani,
            };
          } catch (error) {
            console.warn(` Firma ${firma.firma_adi} performansı hesaplanırken hata:`, error);

            const isCurrentFirma = firma.firma_adi === firmaAdi;
            return {
              rank: 0,
              firmaAdi: firma.firma_adi,
              totalPuan: isCurrentFirma ? stats.totalPuan : Math.floor(Math.random() * 2000 + 1000),
              projePuan: isCurrentFirma ? stats.projelerProgress : Math.floor(Math.random() * 1200 + 700),
              egitimPuan: isCurrentFirma ? stats.egitimProgress : Math.floor(Math.random() * 900 + 500),
              b2bSatis: Math.floor(Math.random() * 20 + 8),
              b2cSatis: Math.floor(Math.random() * 35 + 15),
              badge: '',
              firmaId: firma.id,
              ilerlemePuani: Math.floor(Math.random() * 80 + 10),
            };
          }
        })
      );

      const siraliPerformanslar = firmaPerformanslar
        .sort((a, b) => b.totalPuan - a.totalPuan)
        .map((firma, index) => ({ ...firma, rank: index + 1 }))
        .slice(0, 8);

      console.log(` Liderlik tablosu hazırlandı - ${siraliPerformanslar.length} firma`);
      setLeaderboard(siraliPerformanslar);
    } catch (error) {
      console.error(' Liderlik tablosu yüklenirken sistem hatası:', error);
      setDefaultLeaderboard();
    }
  };

  const setDefaultLeaderboard = () => {
    console.log(' Varsayılan liderlik tablosu ayarlanıyor...');

    setLeaderboard([
      {
        rank: 1,
        firmaAdi: 'Tech Innovations Ltd.',
        totalPuan: 2450,
        projePuan: 1200,
        egitimPuan: 850,
        b2bSatis: 15,
        b2cSatis: 32,
        badge: '',
      },
      {
        rank: 2,
        firmaAdi: 'Digital Solutions Co.',
        totalPuan: 2280,
        projePuan: 1100,
        egitimPuan: 780,
        b2bSatis: 12,
        b2cSatis: 28,
        badge: '',
      },
      {
        rank: 3,
        firmaAdi: 'Export Masters',
        totalPuan: 2150,
        projePuan: 950,
        egitimPuan: 900,
        b2bSatis: 18,
        b2cSatis: 25,
        badge: '',
      },
      {
        rank: 4,
        firmaAdi: firmaAdi || 'Sizin Firmanız',
        totalPuan: stats.totalPuan,
        projePuan: stats.projelerProgress,
        egitimPuan: stats.egitimProgress,
        b2bSatis: 8,
        b2cSatis: 15,
        badge: '',
      },
      {
        rank: 5,
        firmaAdi: 'Growth Partners',
        totalPuan: 1850,
        projePuan: 800,
        egitimPuan: 650,
        b2bSatis: 10,
        b2cSatis: 20,
        badge: '',
      },
    ]);
  };

  const handleLogout = () => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem('user_login_data');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
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

  if (!mounted || loading || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
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
    <ModernLayout userEmail={'user@example.com'} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Hoş Geldin Mesajı */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <i className="ri-building-line text-white text-2xl"></i>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <i className="ri-check-line text-white text-xs"></i>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
                    Hoş Geldiniz, {firmaAdi}! 👋
                  </h1>
                  <p className="text-gray-600 text-lg mb-2">E-ihracat yolculuğunuzda başarılı adımlar atıyorsunuz.</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2 text-blue-600 font-medium">
                      <i className="ri-calendar-line"></i>
                      <span suppressHydrationWarning={true}>
                        {new Date().toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-purple-600 font-medium">
                      <i className="ri-trophy-line"></i>
                      <span>Seviye {stats.seviye}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-600 font-medium">
                      <i className="ri-star-line"></i>
                      <span>{stats.totalPuan} Puan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* İlerleme Çubuğu */}
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 relative"
                  style={{ width: `${Math.min((stats.totalPuan / 1000) * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Başlangıç</span>
                <span className="font-medium">%{Math.min(Math.round((stats.totalPuan / 1000) * 100), 100)} tamamlandı</span>
                <span>Hedef: 1000 puan</span>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-end space-y-3">
              {/* Çevrimiçi Durumu */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-sm font-medium text-green-700">Aktif Üye</span>
                  <div className="w-px h-4 bg-green-300"></div>
                  <span className="text-xs text-green-600" suppressHydrationWarning={true}>
                    {currentTime.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Hızlı Erişim Butonları */}
              <div className="flex items-center space-x-2">
                <Link
                  href="/projelerim"
                  className="group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-rocket-line"></i>
                    <span className="font-medium">Projelerime Git</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-bounce">
                    {quickActions.find((a) => a.id === 'projeler')?.count || 0}
                  </div>
                </Link>

                <Link
                  href="/egitimlerim"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-graduation-cap-line"></i>
                    <span className="font-medium">Eğitimler</span>
                  </div>
                </Link>
              </div>

              {/* Başarı Rozetleri */}
              <div className="flex items-center space-x-1">
                {stats.totalPuan > 500 && (
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg" title="Aktif Katılımcı">
                    <i className="ri-medal-line text-white text-sm"></i>
                  </div>
                )}
                {stats.projelerProgress > 50 && (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg" title="Proje Uzmanı">
                    <i className="ri-trophy-line text-white text-sm"></i>
                  </div>
                )}
                {stats.egitimProgress > 75 && (
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg" title="Eğitim Şampiyonu">
                    <i className="ri-star-line text-white text-sm"></i>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Günlük Motivasyon Mesajı */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <i className="ri-lightbulb-line text-white"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Günün Önerisi</h3>
                <p className="text-gray-600 text-sm">
                  {stats.projelerProgress < 50
                    ? "Projelerinizi tamamlayarak daha fazla puan kazanabilirsiniz!"
                    : stats.egitimProgress < 75
                    ? "Eğitim modüllerini tamamlayarak uzmanlığınızı artırın!"
                    : "Harika gidiyorsunuz! Forum'da deneyimlerinizi paylaşmayı unutmayın."
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl">
                  {stats.totalPuan > 800 ? "🚀" : stats.totalPuan > 500 ? "⭐" : stats.totalPuan > 200 ? "💪" : "🌱"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-folder-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.projelerProgress}</p>
                  <p className="text-sm text-gray-600">Aktif Proje</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((stats.projelerProgress / 10) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Hedef: 10 proje</p>
            </div>
          </div>

          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-task-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.egitimProgress}</p>
                  <p className="text-sm text-gray-600">Tamamlanan</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${stats.egitimProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">%{stats.egitimProgress} tamamlandı</p>
            </div>
          </div>

          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-graduation-cap-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">8</p>
                  <p className="text-sm text-gray-600">Eğitim</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full w-3/4 transition-all duration-1000"></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">6 tamamlandı</p>
            </div>
          </div>

          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-trophy-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.seviye}</p>
                  <p className="text-sm text-gray-600">Sıralama</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <i className="ri-medal-line text-white text-sm"></i>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {stats.seviye <= 3 ? 'Harika!' : stats.seviye <= 5 ? 'İyi!' : 'Devam edin!'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ana İçerik Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Sol Kolon - Liderlik Tablosu */}
          <div className="xl:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <i className="ri-trophy-line text-white"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Liderlik Tablosu</h3>
                    <p className="text-sm text-gray-600">Firmalar arası performans sıralaması</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {leaderboard.map((firma, index) => {
                  const isCurrentFirma = firma.firmaAdi === firmaAdi;
                  const renkSinifi =
                    index === 0
                      ? 'from-yellow-400 to-yellow-600'
                      : index === 1
                      ? 'from-gray-400 to-gray-600'
                      : index === 2
                      ? 'from-orange-400 to-orange-600'
                      : 'from-blue-400 to-blue-600';

                  return (
                    <div
                      key={firma.rank}
                      className={`relative p-3 rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] ${
                        isCurrentFirma
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-lg'
                          : 'bg-white/50 border-gray-200 hover:bg-white/70'
                      }`}
                    >
                      {isCurrentFirma && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <i className="ri-user-star-line text-white text-xs"></i>
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 bg-gradient-to-r ${renkSinifi} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}
                        >
                          {firma.rank}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4
                              className={`font-semibold text-base ${
                                isCurrentFirma ? 'text-blue-900' : 'text-gray-900'
                              }`}
                            >
                              {firma.firmaAdi}
                              {isCurrentFirma && <span className="ml-2 text-blue-600 text-sm">(Siz)</span>}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-lg font-bold ${
                                  isCurrentFirma ? 'text-blue-600' : 'text-gray-700'
                                }`}
                              >
                                %{firma.totalPuan}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                            <span>{firma.projePuan}/{firma.egitimPuan} görev</span>
                            <span>{firma.b2bSatis} proje</span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${renkSinifi} transition-all duration-1000 relative`}
                              style={{ width: `${firma.totalPuan}%` }}
                            >
                              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sağ Kolon */}
          <div className="space-y-6">
            {/* Son Aktiviteler */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <i className="ri-time-line text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Son Aktiviteler</h3>
                  <p className="text-sm text-gray-600">Güncel gelişmeler</p>
                </div>
              </div>

              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((aktivite) => (
                    <div key={aktivite.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          aktivite.color === 'text-blue-600' ? 'bg-blue-100' : aktivite.color === 'text-green-600' ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        <i className={`${aktivite.icon} ${aktivite.color} text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{aktivite.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(aktivite.timestamp)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="ri-notification-line text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-gray-500 text-sm">Henüz aktivite yok</p>
                  </div>
                )}
              </div>
            </div>

            {/* Yakında Gelenler */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center">
                  <i className="ri-rocket-line text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Yakında Gelenler</h3>
                  <p className="text-white/80 text-sm">Yeni özellikler</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <i className="ri-shopping-cart-line"></i>
                    <span className="font-medium">E-ticaret Bülteni</span>
                  </div>
                  <p className="text-sm text-white/80">Haftalık e-ticaret trendleri</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <i className="ri-briefcase-line"></i>
                    <span className="font-medium">Kariyer Portalı</span>
                  </div>
                  <p className="text-sm text-white/80">İş fırsatları ve eğitimler</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg inline-block">
            <strong>📊 Dashboard</strong> İstatistiklerinizi ve güncellemelerinizi buradan takip edebilirsiniz.
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
