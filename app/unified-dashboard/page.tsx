'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedLayout from '@/components/Layout/UnifiedLayout';
import UserTypeSwitch, { useUserContext } from '@/components/UserTypeSwitch';
import {
  DashboardCard,
  DashboardSection,
  QuickActions,
  RecentActivity,
  StatisticsOverview,
  AdminDashboardLayout,
  ConsultantDashboardLayout,
  CompanyDashboardLayout,
  WelcomeBanner
} from '@/components/ui/RoleBasedDashboard';

interface DashboardData {
  stats: any[];
  quickActions: any[];
  recentActivities: any[];
}

export default function UnifiedDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: [],
    quickActions: [],
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);

  const context = useUserContext();
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, [context]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!context) {
        router.push('/login');
        return;
      }

      // Load role-specific dashboard data
      const data = await getRoleSpecificData(context.userType);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificData = async (userType: string): Promise<DashboardData> => {
    // Simulate API calls - in production, this would fetch from your backend
    await new Promise(resolve => setTimeout(resolve, 500));

    switch (userType) {
      case 'master_admin':
      case 'admin':
        return getAdminDashboardData();
      case 'consultant':
        return getConsultantDashboardData();
      case 'company_owner':
      case 'company_manager':
      case 'company_personnel':
        return getCompanyDashboardData(userType);
      default:
        return { stats: [], quickActions: [], recentActivities: [] };
    }
  };

  const getAdminDashboardData = (): DashboardData => ({
    stats: [
      {
        title: 'Toplam Firmalar',
        value: '124',
        icon: 'ri-building-line',
        color: 'bg-blue-500',
        change: { value: 12, type: 'increase', period: 'bu ay' },
        onClick: () => router.push('/admin-firmalar')
      },
      {
        title: 'Aktif Projeler',
        value: '89',
        icon: 'ri-project-line',
        color: 'bg-green-500',
        change: { value: 8, type: 'increase', period: 'bu hafta' },
        onClick: () => router.push('/admin-proje-yonetimi')
      },
      {
        title: 'Danışmanlar',
        value: '15',
        icon: 'ri-user-star-line',
        color: 'bg-purple-500',
        change: { value: 2, type: 'increase', period: 'bu ay' },
        onClick: () => router.push('/admin-consultant-yonetimi')
      },
      {
        title: 'Randevu Talepleri',
        value: '23',
        icon: 'ri-calendar-check-line',
        color: 'bg-orange-500',
        badge: 5,
        onClick: () => router.push('/admin-randevu-talepleri')
      }
    ],
    quickActions: [
      {
        label: 'Yeni Firma',
        icon: 'ri-building-add-line',
        color: 'bg-blue-500',
        onClick: () => router.push('/admin-firmalar')
      },
      {
        label: 'Proje Oluştur',
        icon: 'ri-add-circle-line',
        color: 'bg-green-500',
        onClick: () => router.push('/admin-proje-yonetimi')
      },
      {
        label: 'Danışman Ekle',
        icon: 'ri-user-add-line',
        color: 'bg-purple-500',
        onClick: () => router.push('/admin-consultant-yonetimi')
      },
      {
        label: 'Yetki Yönetimi',
        icon: 'ri-shield-user-line',
        color: 'bg-red-500',
        onClick: () => router.push('/admin-permission-yonetimi')
      }
    ],
    recentActivities: [
      {
        id: 1,
        title: 'Yeni firma kaydı',
        description: 'ABC İhracat A.Ş. sisteme kaydoldu',
        timestamp: '2 saat önce',
        icon: 'ri-building-line',
        color: 'bg-blue-500',
        href: '/admin-firmalar'
      },
      {
        id: 2,
        title: 'Proje tamamlandı',
        description: 'E-ihracat Eğitim Programı tamamlandı',
        timestamp: '4 saat önce',
        icon: 'ri-check-circle-line',
        color: 'bg-green-500',
        href: '/admin-proje-yonetimi'
      },
      {
        id: 3,
        title: 'Randevu talebi',
        description: 'XYZ Firma danışmanlık talebi gönderdi',
        timestamp: '1 gün önce',
        icon: 'ri-calendar-line',
        color: 'bg-orange-500',
        href: '/admin-randevu-talepleri'
      }
    ]
  });

  const getConsultantDashboardData = (): DashboardData => ({
    stats: [
      {
        title: 'Atanmış Firmalar',
        value: '8',
        icon: 'ri-building-line',
        color: 'bg-blue-500',
        onClick: () => router.push('/consultant-companies')
      },
      {
        title: 'Aktif Projeler',
        value: '12',
        icon: 'ri-project-line',
        color: 'bg-green-500',
        onClick: () => router.push('/consultant-projects')
      },
      {
        title: 'Bu Ay Tamamlanan',
        value: '5',
        icon: 'ri-check-circle-line',
        color: 'bg-purple-500',
        change: { value: 25, type: 'increase', period: 'geçen aya göre' }
      },
      {
        title: 'İş Yükü',
        value: '75%',
        icon: 'ri-pie-chart-line',
        color: 'bg-orange-500'
      }
    ],
    quickActions: [
      {
        label: 'Firmalarım',
        icon: 'ri-building-line',
        color: 'bg-blue-500',
        onClick: () => router.push('/consultant-companies')
      },
      {
        label: 'Projeler',
        icon: 'ri-project-line',
        color: 'bg-green-500',
        onClick: () => router.push('/consultant-projects')
      },
      {
        label: 'Raporlar',
        icon: 'ri-file-chart-line',
        color: 'bg-purple-500',
        onClick: () => router.push('/consultant-reports')
      },
      {
        label: 'Profil',
        icon: 'ri-user-line',
        color: 'bg-gray-500',
        onClick: () => router.push('/consultant-profile')
      }
    ],
    recentActivities: [
      {
        id: 1,
        title: 'Proje güncellendi',
        description: 'ABC Firma - E-ihracat projesi ilerleme kaydetti',
        timestamp: '1 saat önce',
        icon: 'ri-refresh-line',
        color: 'bg-blue-500'
      },
      {
        id: 2,
        title: 'Firma iletişimi',
        description: 'XYZ Firma ile toplantı planlandı',
        timestamp: '3 saat önce',
        icon: 'ri-calendar-line',
        color: 'bg-green-500'
      }
    ]
  });

  const getCompanyDashboardData = (userType: string): DashboardData => ({
    stats: [
      {
        title: 'Aktif Projeler',
        value: '3',
        icon: 'ri-folder-line',
        color: 'bg-blue-500',
        onClick: () => router.push('/projelerim')
      },
      {
        title: 'Tamamlanan Eğitimler',
        value: '7',
        icon: 'ri-graduation-cap-line',
        color: 'bg-green-500',
        onClick: () => router.push('/egitimlerim')
      },
      {
        title: 'Etkinlik Katılımları',
        value: '12',
        icon: 'ri-calendar-event-line',
        color: 'bg-purple-500',
        onClick: () => router.push('/etkinlikler')
      },
      {
        title: 'Forum Aktivitesi',
        value: '25',
        icon: 'ri-discuss-line',
        color: 'bg-orange-500',
        onClick: () => router.push('/forum')
      }
    ],
    quickActions: [
      {
        label: 'Projelerim',
        icon: 'ri-folder-line',
        color: 'bg-blue-500',
        onClick: () => router.push('/projelerim')
      },
      {
        label: 'Eğitimler',
        icon: 'ri-graduation-cap-line',
        color: 'bg-green-500',
        onClick: () => router.push('/egitimlerim')
      },
      ...(userType === 'company_owner' ? [{
        label: 'Personel Yönetimi',
        icon: 'ri-team-line',
        color: 'bg-purple-500',
        onClick: () => router.push('/firma-personel-yonetimi')
      }] : []),
      {
        label: 'Randevu Al',
        icon: 'ri-calendar-check-line',
        color: 'bg-orange-500',
        onClick: () => router.push('/randevu-talebi')
      }
    ],
    recentActivities: [
      {
        id: 1,
        title: 'Eğitim tamamlandı',
        description: 'İhracat Süreçleri eğitimi başarıyla tamamlandı',
        timestamp: '2 saat önce',
        icon: 'ri-check-circle-line',
        color: 'bg-green-500'
      },
      {
        id: 2,
        title: 'Yeni proje ataması',
        description: 'Dijital Pazarlama projesi atandı',
        timestamp: '1 gün önce',
        icon: 'ri-add-circle-line',
        color: 'bg-blue-500'
      }
    ]
  });

  const renderDashboardContent = () => {
    if (!context) return null;

    const { stats, quickActions, recentActivities } = dashboardData;

    switch (context.userType) {
      case 'master_admin':
      case 'admin':
        return (
          <AdminDashboardLayout>
            <div className="space-y-8">
              <WelcomeBanner
                title={`Hoş Geldiniz, ${context.fullName}!`}
                subtitle="Sistem yönetimi ve genel durum özeti"
                userType={context.userType}
                actions={quickActions.slice(0, 2)}
              />
              
              <StatisticsOverview stats={stats} title="Sistem İstatistikleri" />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <QuickActions actions={quickActions} />
                <RecentActivity activities={recentActivities} />
              </div>
            </div>
          </AdminDashboardLayout>
        );

      case 'consultant':
        return (
          <ConsultantDashboardLayout>
            <div className="space-y-8">
              <WelcomeBanner
                title={`Hoş Geldiniz, ${context.fullName}!`}
                subtitle="Danışmanlık görevleri ve atanmış projeler"
                userType={context.userType}
                actions={quickActions.slice(0, 2)}
              />
              
              <StatisticsOverview stats={stats} title="Danışmanlık İstatistikleri" />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <QuickActions actions={quickActions} />
                <RecentActivity activities={recentActivities} />
              </div>
            </div>
          </ConsultantDashboardLayout>
        );

      default:
        return (
          <CompanyDashboardLayout>
            <div className="space-y-8">
              <WelcomeBanner
                title={`Hoş Geldiniz, ${context.fullName}!`}
                subtitle="E-ihracat yolculuğunuzda başarılı adımlar atıyorsunuz"
                userType={context.userType}
                actions={quickActions.slice(0, 2)}
              />
              
              <StatisticsOverview stats={stats} title="Firma İstatistikleri" />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <QuickActions actions={quickActions} />
                <RecentActivity activities={recentActivities} />
              </div>
            </div>
          </CompanyDashboardLayout>
        );
    }
  };

  if (loading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout requireAuth={true}>
      <div className="space-y-6">
        {/* User Type Switcher */}
        <UserTypeSwitch className="mb-6" />
        
        {/* Dashboard Content */}
        {renderDashboardContent()}
      </div>
    </UnifiedLayout>
  );
}
