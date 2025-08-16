'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ConsultantManagementService, 
  Consultant, 
  ConsultantAssignment,
  CONSULTANT_SPECIALIZATIONS,
  ConsultantSpecialization,
  ConsultantHelper 
} from '@/lib/consultant-management-service';
import { UnifiedLoginService } from '@/lib/multi-level-auth';

export default function AdminConsultantYonetimiPage() {
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<'consultants' | 'assignments'>('consultants');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    specialization: [] as ConsultantSpecialization[],
    department: '',
    title: '',
    maxCompanies: 10,
    maxProjects: 20
  });

  const [assignForm, setAssignForm] = useState({
    consultantId: '',
    assignmentType: 'company' as 'company' | 'project' | 'education_program' | 'event',
    entityId: '',
    startDate: '',
    endDate: '',
    notes: ''
  });

  const router = useRouter();

  // Admin menu items
  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/admin-dashboard' },
    { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar' },
    { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi' },
    { icon: 'ri-user-star-line', label: 'Danışman Yönetimi', href: '/admin-consultant-yonetimi', active: true },
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
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is master admin
      const user = UnifiedLoginService.getCurrentUser();
      if (!user || user.userType !== 'master_admin') {
        console.log('❌ Yetkisiz erişim - sadece master admin');
        router.push('/admin-login');
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Auth/data loading error:', error);
      setError('Sistem hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [consultantsData, assignmentsData] = await Promise.all([
        ConsultantManagementService.getAllConsultants(),
        loadAllAssignments()
      ]);

      setConsultants(consultantsData);
      setAssignments(assignmentsData);

      console.log('✅ Consultant data loaded:', {
        consultants: consultantsData.length,
        assignments: assignmentsData.length
      });
    } catch (error) {
      console.error('Load data error:', error);
      setError('Veriler yüklenemedi');
    }
  };

  const loadAllAssignments = async (): Promise<ConsultantAssignment[]> => {
    // Since we don't have a method to get all assignments, we'll aggregate from consultants
    try {
      const allConsultants = await ConsultantManagementService.getAllConsultants();
      const allAssignments: ConsultantAssignment[] = [];
      
      for (const consultant of allConsultants) {
        const consultantAssignments = await ConsultantManagementService.getConsultantAssignments(consultant.id);
        allAssignments.push(...consultantAssignments);
      }
      
      return allAssignments;
    } catch (error) {
      console.error('Load all assignments error:', error);
      return [];
    }
  };

  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!createForm.email.trim() || !createForm.fullName.trim()) {
      setError('E-posta ve ad soyad gerekli');
      return;
    }

    if (createForm.specialization.length === 0) {
      setError('En az bir uzmanlık alanı seçmelisiniz');
      return;
    }

    try {
      const user = UnifiedLoginService.getCurrentUser();
      if (!user?.id) return;

      const consultant = await ConsultantManagementService.createConsultant({
        email: createForm.email.trim(),
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim() || undefined,
        specialization: createForm.specialization,
        department: createForm.department.trim() || undefined,
        title: createForm.title.trim() || undefined,
        maxCompanies: createForm.maxCompanies,
        maxProjects: createForm.maxProjects,
        createdBy: user.id
      });

      if (consultant) {
        setMessage(`✅ ${createForm.fullName} danışman olarak eklendi`);
        setCreateForm({
          email: '',
          fullName: '',
          phone: '',
          specialization: [],
          department: '',
          title: '',
          maxCompanies: 10,
          maxProjects: 20
        });
        setShowCreateForm(false);
        await loadData();
      } else {
        setError('Danışman eklenemedi');
      }
    } catch (error) {
      console.error('Create consultant error:', error);
      setError('Danışman eklenirken hata oluştu');
    }
  };

  const handleUpdateConsultantStatus = async (consultantId: number, status: 'active' | 'inactive' | 'suspended') => {
    try {
      const success = await ConsultantManagementService.updateConsultant(consultantId, { status });
      if (success) {
        setMessage('✅ Danışman durumu güncellendi');
        await loadData();
      } else {
        setError('Danışman durumu güncellenemedi');
      }
    } catch (error) {
      console.error('Update consultant status error:', error);
      setError('Durum güncellenirken hata oluştu');
    }
  };

  const handleSpecializationChange = (specialization: ConsultantSpecialization, checked: boolean) => {
    setCreateForm(prev => ({
      ...prev,
      specialization: checked 
        ? [...prev.specialization, specialization]
        : prev.specialization.filter(s => s !== specialization)
    }));
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      router.push('/admin-login');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 font-['Pacifico']">
              Admin Panel
            </Link>
            <span className="text-gray-300">→</span>
            <h1 className="text-xl font-semibold text-gray-900">Danışman Yönetimi</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
          >
            <i className="ri-logout-circle-r-line"></i>
            <span>Çıkış</span>
          </button>
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
          {/* Top Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('consultants')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'consultants'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <i className="ri-user-star-line mr-2"></i>
                Danışmanlar ({consultants.length})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'assignments'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <i className="ri-task-line mr-2"></i>
                Atamalar ({assignments.length})
              </button>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <i className="ri-user-add-line"></i>
              <span>Yeni Danışman</span>
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Consultants Tab */}
          {activeTab === 'consultants' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Danışmanlar</h2>
              </div>
              
              {consultants.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <i className="ri-user-star-line text-4xl mb-4"></i>
                  <p>Henüz danışman bulunmuyor</p>
                  <p className="text-sm mt-2">Yeni danışman ekleyerek başlayın</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Danışman
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uzmanlık
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İş Yükü
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {consultants.map((consultant) => {
                        const workload = ConsultantHelper.calculateWorkload(consultant);
                        const availability = ConsultantHelper.getAvailabilityStatus(consultant);
                        
                        return (
                          <tr key={consultant.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {consultant.user?.fullName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {consultant.user?.email}
                                </div>
                                {consultant.title && (
                                  <div className="text-xs text-gray-400">
                                    {consultant.title}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {consultant.specialization.slice(0, 2).map((spec) => (
                                  <span
                                    key={spec}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    <i className={`${ConsultantHelper.getSpecializationIcon(spec)} mr-1`}></i>
                                    {ConsultantHelper.getSpecializationDisplayName(spec)}
                                  </span>
                                ))}
                                {consultant.specialization.length > 2 && (
                                  <span className="text-xs text-gray-500">
                                    +{consultant.specialization.length - 2} daha
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1">
                                  <div className="flex justify-between text-sm">
                                    <span>%{workload}</span>
                                    <span className={availability.color}>
                                      {availability.message}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div
                                      className={`h-2 rounded-full ${
                                        workload < 50 ? 'bg-green-500' :
                                        workload < 80 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(workload, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {consultant.assignedCompaniesCount} firma, {consultant.assignedProjectsCount} proje
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ConsultantHelper.getStatusBadgeColor(consultant.status)
                              }`}>
                                {consultant.status === 'active' ? 'Aktif' :
                                 consultant.status === 'inactive' ? 'Pasif' : 'Askıya Alınmış'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {consultant.status === 'active' ? (
                                  <button
                                    onClick={() => handleUpdateConsultantStatus(consultant.id, 'inactive')}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Pasif Yap"
                                  >
                                    <i className="ri-pause-circle-line"></i>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateConsultantStatus(consultant.id, 'active')}
                                    className="text-green-600 hover:text-green-900 transition-colors"
                                    title="Aktif Yap"
                                  >
                                    <i className="ri-play-circle-line"></i>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedConsultant(consultant);
                                    setShowAssignForm(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 transition-colors"
                                  title="Ata"
                                >
                                  <i className="ri-add-circle-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Atamalar</h2>
              </div>
              
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <i className="ri-task-line text-4xl mb-4"></i>
                  <p>Henüz atama bulunmuyor</p>
                  <p className="text-sm mt-2">Danışmanlara görev atayarak başlayın</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Danışman
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Atama Türü
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.consultant?.fullName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {assignment.assignmentType === 'company' ? 'Firma' :
                               assignment.assignmentType === 'project' ? 'Proje' :
                               assignment.assignmentType === 'education_program' ? 'Eğitim' : 'Etkinlik'}
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
                            {new Date(assignment.assignedAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {assignment.status === 'active' && (
                              <button
                                onClick={() => ConsultantManagementService.completeAssignment(assignment.id)}
                                className="text-green-600 hover:text-green-900 transition-colors"
                                title="Tamamla"
                              >
                                <i className="ri-check-circle-line"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Create Consultant Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Yeni Danışman Ekle</h3>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>

                  <form onSubmit={handleCreateConsultant} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          E-posta Adresi *
                        </label>
                        <input
                          type="email"
                          value={createForm.email}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ad Soyad *
                        </label>
                        <input
                          type="text"
                          value={createForm.fullName}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          value={createForm.phone}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Departman
                        </label>
                        <input
                          type="text"
                          value={createForm.department}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ünvan
                      </label>
                      <input
                        type="text"
                        value={createForm.title}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Kıdemli Danışman"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Uzmanlık Alanları *
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {CONSULTANT_SPECIALIZATIONS.map((spec) => (
                          <label key={spec.value} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={createForm.specialization.includes(spec.value)}
                              onChange={(e) => handleSpecializationChange(spec.value, e.target.checked)}
                              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center">
                              <i className={`${spec.icon} mr-2 text-gray-500`}></i>
                              <span className="text-sm text-gray-700">{spec.label}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Firma Sayısı
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={createForm.maxCompanies}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, maxCompanies: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Proje Sayısı
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={createForm.maxProjects}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, maxProjects: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      >
                        Danışman Ekle
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
