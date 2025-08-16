'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ConsultantManagementService, 
  Consultant, 
  ConsultantAssignment,
  ConsultantPerformance,
  ConsultantHelper 
} from '@/lib/consultant-management-service';
import { UnifiedLoginService } from '@/lib/multi-level-auth';

interface DashboardStats {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  companiesManaged: number;
  projectsManaged: number;
  thisMonthCompletions: number;
}

export default function ConsultantDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([]);
  const [performance, setPerformance] = useState<ConsultantPerformance | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    completedAssignments: 0,
    companiesManaged: 0,
    projectsManaged: 0,
    thisMonthCompletions: 0
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'performance'>('overview');
  const [error, setError] = useState('');

  const router = useRouter();

  // Consultant menu items
  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/consultant-dashboard', active: true },
    { icon: 'ri-building-line', label: 'Firmalarım', href: '/consultant-companies' },
    { icon: 'ri-project-line', label: 'Projelerim', href: '/consultant-projects' },
    { icon: 'ri-graduation-cap-line', label: 'Eğitim Programları', href: '/consultant-education' },
    { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/consultant-events' },
    { icon: 'ri-bar-chart-line', label: 'Raporlar', href: '/consultant-reports' },
    { icon: 'ri-user-line', label: 'Profil', href: '/consultant-profile' },
  ];

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is consultant
      const user = UnifiedLoginService.getCurrentUser();
      if (!user || user.userType !== 'consultant') {
        console.log('❌ Yetkisiz erişim - sadece danışmanlar');
        router.push('/login');
        return;
      }

      await loadConsultantData(user.id);
    } catch (error) {
      console.error('Auth/data loading error:', error);
      setError('Sistem hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadConsultantData = async (userId: number) => {
    try {
      // Get consultant profile
      const consultantData = await ConsultantManagementService.getConsultantByUserId(userId);
      if (!consultantData) {
        setError('Danışman profili bulunamadı');
        return;
      }
      setConsultant(consultantData);

      // Get assignments
      const assignmentsData = await ConsultantManagementService.getConsultantAssignments(consultantData.id);
      setAssignments(assignmentsData);

      // Get performance metrics
      const performanceData = await ConsultantManagementService.getConsultantPerformance(consultantData.id, 'monthly');
      setPerformance(performanceData);

      // Calculate dashboard stats
      const dashboardStats = calculateDashboardStats(assignmentsData);
      setStats(dashboardStats);

      console.log('✅ Consultant data loaded:', {
        consultant: consultantData.user?.fullName,
        assignments: assignmentsData.length,
        performance: performanceData
      });
    } catch (error) {
      console.error('Load consultant data error:', error);
      setError('Danışman verileri yüklenemedi');
    }
  };

  const calculateDashboardStats = (assignmentsData: ConsultantAssignment[]): DashboardStats => {
    const totalAssignments = assignmentsData.length;
    const activeAssignments = assignmentsData.filter(a => a.status === 'active').length;
    const completedAssignments = assignmentsData.filter(a => a.status === 'completed').length;
    
    const companiesManaged = new Set(
      assignmentsData
        .filter(a => a.assignmentType === 'company' && a.status === 'active')
        .map(a => a.entityId)
    ).size;
    
    const projectsManaged = new Set(
      assignmentsData
        .filter(a => a.assignmentType === 'project' && a.status === 'active')
        .map(a => a.entityId)
    ).size;

    // This month completions
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthCompletions = assignmentsData.filter(a => 
      a.status === 'completed' && 
      a.endDate && 
      new Date(a.endDate) >= thisMonth
    ).length;

    return {
      totalAssignments,
      activeAssignments,
      completedAssignments,
      companiesManaged,
      projectsManaged,
      thisMonthCompletions
    };
  };

  const getWorkloadColor = (workload: number): string => {
    if (workload < 50) return 'text-green-600';
    if (workload < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleLogout = async () => {
    try {
      await UnifiedLoginService.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">
            <i className="ri-error-warning-line"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hata Oluştu</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <i className="ri-login-box-line"></i>
            <span>Giriş Sayfasına Dön</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/consultant-dashboard" className="text-2xl font-bold text-blue-600 font-['Pacifico']">
              Danışman Panel
            </Link>
            <span className="text-gray-300">→</span>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{consultant?.user?.fullName}</div>
              <div className="text-xs text-gray-500">{consultant?.title || 'Danışman'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
            >
              <i className="ri-logout-circle-r-line"></i>
              <span>Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      item.active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <i className={item.icon}></i>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hoş geldiniz, {consultant?.user?.fullName}
            </h2>
            <p className="text-gray-600">
              Danışman dashboard'unuzda güncel bilgilerinizi görebilirsiniz
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Atama</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAssignments}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="ri-task-line text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Görevler</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeAssignments}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-play-circle-line text-green-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Yönetilen Firma</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.companiesManaged}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-building-line text-purple-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bu Ay Tamamlanan</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.thisMonthCompletions}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="ri-check-double-line text-orange-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Consultant Profile Card */}
          {consultant && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Danışman Profili</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Uzmanlık Alanları</h4>
                  <div className="flex flex-wrap gap-2">
                    {consultant.specialization.map((spec) => (
                      <span
                        key={spec}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        <i className={`${ConsultantHelper.getSpecializationIcon(spec)} mr-1`}></i>
                        {ConsultantHelper.getSpecializationDisplayName(spec)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">İş Yükü</h4>
                  <div className="space-y-2">
                    {consultant.maxCompanies && (
                      <div className="flex justify-between text-sm">
                        <span>Firma Kapasitesi:</span>
                        <span className={getWorkloadColor((consultant.assignedCompaniesCount || 0) / consultant.maxCompanies * 100)}>
                          {consultant.assignedCompaniesCount} / {consultant.maxCompanies}
                        </span>
                      </div>
                    )}
                    {consultant.maxProjects && (
                      <div className="flex justify-between text-sm">
                        <span>Proje Kapasitesi:</span>
                        <span className={getWorkloadColor((consultant.assignedProjectsCount || 0) / consultant.maxProjects * 100)}>
                          {consultant.assignedProjectsCount} / {consultant.maxProjects}
                        </span>
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Genel İş Yükü:</span>
                        <span className={getWorkloadColor(ConsultantHelper.calculateWorkload(consultant))}>
                          %{ConsultantHelper.calculateWorkload(consultant)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            ConsultantHelper.calculateWorkload(consultant) < 50 ? 'bg-green-500' :
                            ConsultantHelper.calculateWorkload(consultant) < 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(ConsultantHelper.calculateWorkload(consultant), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">İstatistikler</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tamamlanan Projeler:</span>
                      <span className="font-medium">{consultant.completedProjectsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>İşe Başlama Tarihi:</span>
                      <span className="font-medium">
                        {new Date(consultant.hireDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Durum:</span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        ConsultantHelper.getStatusBadgeColor(consultant.status)
                      }`}>
                        {consultant.status === 'active' ? 'Aktif' :
                         consultant.status === 'inactive' ? 'Pasif' : 'Askıya Alınmış'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Assignments */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Son Atamalar</h3>
            </div>
            
            {assignments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <i className="ri-task-line text-4xl mb-4"></i>
                <p>Henüz atama bulunmuyor</p>
                <p className="text-sm mt-2">Yeni atamalar burada görünecek</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Atama Türü
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Başlangıç Tarihi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notlar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.slice(0, 5).map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.assignmentType === 'company' ? 'Firma Yönetimi' :
                             assignment.assignmentType === 'project' ? 'Proje Yönetimi' :
                             assignment.assignmentType === 'education_program' ? 'Eğitim Programı' : 'Etkinlik Yönetimi'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {assignment.entityId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ConsultantHelper.getAssignmentStatusColor(assignment.status)
                          }`}>
                            {assignment.status === 'active' ? 'Aktif' :
                             assignment.status === 'completed' ? 'Tamamlandı' :
                             assignment.status === 'paused' ? 'Duraklatıldı' : 'İptal Edildi'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {assignment.startDate ? 
                            new Date(assignment.startDate).toLocaleDateString('tr-TR') :
                            new Date(assignment.assignedAt).toLocaleDateString('tr-TR')
                          }
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {assignment.notes ? 
                            assignment.notes.substring(0, 50) + (assignment.notes.length > 50 ? '...' : '') :
                            '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {assignments.length > 5 && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <Link
                  href="/consultant-assignments"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Tüm Atamaları Görüntüle ({assignments.length})
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
