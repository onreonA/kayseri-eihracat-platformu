
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface DashboardStats {
  totalFirmalar: number;
  aktiveFirmalar: number;
  pasifFirmalar: number;
  onayBekleyenGorevler: number;
  totalRandevuTalepleri: number;
  pendingRandevuTalepleri: number;
}

interface RecentActivity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalFirmalar: 0,
    aktiveFirmalar: 0,
    pasifFirmalar: 0,
    onayBekleyenGorevler: 0,
    totalRandevuTalepleri: 0,
    pendingRandevuTalepleri: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const router = useRouter();
  const isMountedRef = useRef(false);

  const menuItems = [
    {
      icon: 'ri-dashboard-line',
      label: 'Dashboard',
      href: '/admin-dashboard',
      active: true,
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
      icon: 'ri-user-star-line',
      label: 'Danışman Yönetimi',
      href: '/admin-consultant-yonetimi',
    },
    {
      icon: 'ri-calendar-check-line',
      label: 'Randevu Talepleri',
      href: '/admin-randevu-talepleri',
    },
    {
      icon: 'ri-graduation-cap-line',
      label: 'Eğitim Yönetimi',
      href: '/admin-egitim-yonetimi',
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
      icon: 'ri-file-text-line',
      label: 'Destek Dokümanları',
      href: '/admin-destek-dokumanlari',
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
    setMounted(true);
    isMountedRef.current = true;

    const checkAuth = async () => {
      try {
        // Önce localStorage kontrolü yap
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
        const adminToken = localStorage.getItem('admin_token');
        
        console.log('🔍 Admin kontrolü:', { isAdminLoggedIn, adminToken });
        
        if (isAdminLoggedIn === 'true' && adminToken) {
          console.log('✅ Admin girişi doğrulandı, dashboard yükleniyor...');
          if (isMountedRef.current) {
            await loadSupabaseDashboardData();
          }
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
        
        if (isMountedRef.current) {
          await loadSupabaseDashboardData();
        }
      } catch (e) {
        console.error('[AdminDashboard]', e instanceof Error ? e.message : 'Bilinmeyen hata', e);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMountedRef.current = false;
    };
  }, [router]);

  const loadSupabaseDashboardData = async () => {
    try {
      const supabase = getSupabaseClient();
      setLoading(true);

      if (!supabase) {
        await loadFallbackStats();
        return;
      }

      // Firma istatistiklerini Supabase'den al
      console.log('🔍 Firma verilerini çekmeye çalışıyorum...');
      const { data: firmaData, error: firmaError } = await supabase
        .from('firmalar')
        .select('id, firma_adi, durum, created_at');

      let firmalar = [];
      if (firmaError) {
        console.warn('❌ Firma verileri alınamadı:', firmaError);
      } else {
        firmalar = firmaData || [];
        console.log('✅ Firma verileri:', firmalar.length, 'adet firma bulundu', firmalar);
      }

      // Randevu istatistiklerini Supabase'den al
      console.log('🔍 Randevu verilerini çekmeye çalışıyorum...');
      const { data: randevuData, error: randevuError } = await supabase
        .from('randevu_talepleri')
        .select('id, firma_id, konu, durum, created_at');

      let randevular = [];
      if (randevuError) {
        console.warn('❌ Randevu verileri alınamadı:', randevuError);
      } else {
        randevular = randevuData || [];
        console.log('✅ Randevu verileri:', randevular.length, 'adet randevu bulundu', randevular);
      }

      // Görev onay istatistiklerini Supabase'den al
      console.log('🔍 Görev onay verilerini çekmeye çalışıyorum...');
      const { data: gorevOnayData, error: gorevOnayError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .select('id, gorev_id, durum, created_at');

      let gorevOnaylari = [];
      if (gorevOnayError) {
        console.warn('❌ Görev onay verileri alınamadı:', gorevOnayError);
      } else {
        gorevOnaylari = gorevOnayData || [];
        console.log('✅ Görev onay verileri:', gorevOnaylari.length, 'adet görev onayı bulundu', gorevOnaylari);
      }

      // İstatistikleri hesapla
      console.log('📊 İstatistikler hesaplanıyor...');
      const aktiveFirmalar = firmalar.filter((f: any) => f.durum === 'Aktif').length;
      const pasifFirmalar = firmalar.filter((f: any) => f.durum === 'Pasif').length;
      const pendingRandevuTalepleri = randevular.filter((r: any) => r.durum === 'Beklemede').length;
      const onayBekleyenGorevler = gorevOnaylari.filter((g: any) => g.durum === 'Onay Bekliyor').length;
      
      console.log('📈 Hesaplanan istatistikler:', {
        totalFirmalar: firmalar.length,
        aktiveFirmalar,
        pasifFirmalar,
        onayBekleyenGorevler,
        totalRandevuTalepleri: randevular.length,
        pendingRandevuTalepleri
      });

      if (isMountedRef.current) {
        setStats({
          totalFirmalar: firmalar.length,
          aktiveFirmalar,
          pasifFirmalar,
          onayBekleyenGorevler,
          totalRandevuTalepleri: randevular.length,
          pendingRandevuTalepleri
        });

        // Son aktiviteleri yükle
        await loadSupabaseRecentActivities(firmalar, randevular, gorevOnaylari);
        setLoading(false);
      }
    } catch (error) {
      await loadFallbackStats();
    }
  };

  const loadSupabaseRecentActivities = async (firmalar: any[], randevular: any[], gorevOnaylari: any[]) => {
    if (!isMountedRef.current) return;

    try {
      const activities: RecentActivity[] = [];

      // Son eklenen firmalar
      firmalar
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
        .forEach((firma, index) => {
          activities.push({
            id: activities.length + 1,
            type: 'Yeni Firma',
            message: `${firma.firma_adi} sisteme kayıt oldu`,
            timestamp: firma.created_at,
            icon: 'ri-building-line',
            color: 'text-blue-600'
          });
        });

      // Son randevu talepleri
      randevular
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
        .forEach((randevu) => {
          activities.push({
            id: activities.length + 1,
            type: 'Randevu Talebi',
            message: `${randevu.konu} konulu randevu talebi`,
            timestamp: randevu.created_at,
            icon: 'ri-calendar-check-line',
            color: 'text-green-600'
          });
        });

      // Onay bekleyen görevler
      gorevOnaylari
        .filter(g => g.durum === 'Onay Bekliyor')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
        .forEach((gorev) => {
          activities.push({
            id: activities.length + 1,
            type: 'Görev Onayı',
            message: `Görev #${gorev.gorev_id} tamamlama onayı bekliyor`,
            timestamp: gorev.created_at,
            icon: 'ri-check-double-line',
            color: 'text-yellow-600'
          });
        });

      // Aktiviteleri tarihe göre sırala
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

      if (isMountedRef.current) {
        setRecentActivities(sortedActivities);
      }
    } catch (error) {
      console.error('Son aktiviteler yüklenirken hata:', error);
      if (isMountedRef.current) {
        setRecentActivities([]);
      }
    }
  };

  const loadFallbackStats = async () => {
    try {
      // Basit fallback veriler
      if (isMountedRef.current) {
        setStats({
          totalFirmalar: 0,
          aktiveFirmalar: 0,
          pasifFirmalar: 0,
          onayBekleyenGorevler: 0,
          totalRandevuTalepleri: 0,
          pendingRandevuTalepleri: 0
        });
        setRecentActivities([]);
        setLoading(false);
      }
    } catch (e) {
      console.error('[AdminDashboard]', e instanceof Error ? e.message : 'Bilinmeyen hata', e);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleLogout = () => {
    try {
      router.push('/');
    } catch (e) {
      console.error('[AdminDashboard]', e instanceof Error ? e.message : 'Bilinmeyen hata', e);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Supabase verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <div className={`bg-white shadow-lg h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font=[\'Pacifico\']">
                logo
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/50 transition-colors cursor-pointer"
            >
              <i className={`ri-${sidebarCollapsed ? 'menu-unfold' : 'menu-fold'}-line text-gray-600`}></i>
            </button>
          </div>
        </div>

        <div className="p-4">
          {!sidebarCollapsed && <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors cursor-pointer ${
                  item.active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={`${item.icon} text-lg`}></i>
                </div>
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content with proper margin */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Admin Panel</span>
              </div>
              <div className="flex items-center space-x-4">
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

        {/* Page Content */}
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Platform genel durumu ve son aktiviteler</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Firma</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalFirmalar}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="ri-building-line text-blue-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aktif Firma</p>
                    <p className="text-3xl font-bold text-green-600">{stats.aktiveFirmalar}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="ri-check-line text-green-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Onay Bekleyen</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.onayBekleyenGorevler}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i className="ri-time-line text-yellow-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Randevu Talepleri</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.pendingRandevuTalepleri}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="ri-calendar-check-line text-purple-600 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/admin-firmalar"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                      <i className="ri-building-line text-blue-600"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Firma Yönetimi</span>
                  </Link>

                  <Link
                    href="/admin-randevu-talepleri"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                      <i className="ri-calendar-check-line text-green-600"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Randevu Talepleri</span>
                  </Link>

                  <Link
                    href="/admin-egitim-yonetimi"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                      <i className="ri-graduation-cap-line text-yellow-600"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Eğitim Yönetimi</span>
                  </Link>

                  <Link
                    href="/admin-proje-yonetimi"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                      <i className="ri-project-line text-orange-600"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Proje Yönetimi</span>
                  </Link>

                  <Link
                    href="/admin-forum-yonetimi"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                      <i className="ri-discuss-line text-purple-600"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Forum Yönetimi</span>
                  </Link>

                  <Link
                    href="/admin-dashboard-charts"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
                      <i className="ri-bar-chart-line text-indigo-600"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">3 Katman Grafikler</span>
                  </Link>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
                <div className="space-y-4">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            activity.color === 'text-blue-600'
                              ? 'bg-blue-100'
                              : activity.color === 'text-green-600'
                              ? 'bg-green-100'
                              : activity.color === 'text-yellow-600'
                              ? 'bg-yellow-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          <i className={`${activity.icon} ${activity.color} text-sm`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(activity.timestamp)}</p>
                            </div>
                          </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
