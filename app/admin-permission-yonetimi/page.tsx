'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import PermissionGuardComponent, { PermissionButton } from '@/components/PermissionGuard';
import { 
  RBACService, 
  Role, 
  Permission, 
  UserPermission,
  SYSTEM_ROLES, 
  SYSTEM_PERMISSIONS,
  PermissionHelper
} from '@/lib/rbac-permission-system';
import { UnifiedLoginService } from '@/lib/multi-level-auth';

export default function AdminPermissionYonetimiPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [showCreateRoleForm, setShowCreateRoleForm] = useState(false);
  const [showAssignPermissionForm, setShowAssignPermissionForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [createRoleForm, setCreateRoleForm] = useState({
    name: '',
    slug: '',
    description: '',
    level: 5,
    parentRoleId: ''
  });

  const [assignPermissionForm, setAssignPermissionForm] = useState({
    userId: '',
    roleId: '',
    permissionId: '',
    granted: true,
    resourceId: '',
    expiresAt: ''
  });

  const router = useRouter();

  // Admin menu items
  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/admin-dashboard' },
    { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar' },
    { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi' },
    { icon: 'ri-user-star-line', label: 'Danışman Yönetimi', href: '/admin-consultant-yonetimi' },
    { icon: 'ri-shield-user-line', label: 'Yetki Yönetimi', href: '/admin-permission-yonetimi', active: true },
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
      // For now, we'll use mock data since RBAC is not fully implemented yet
      // In production, these would come from the database
      
      const mockRoles: Role[] = SYSTEM_ROLES.map((role, index) => ({
        id: index + 1,
        name: role.name,
        slug: role.slug,
        description: role.description,
        level: role.level,
        parentRoleId: undefined, // Will be set based on parentRoleSlug
        isSystemRole: role.isSystemRole,
        status: 'active',
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userCount: Math.floor(Math.random() * 10)
      }));

      const mockPermissions: Permission[] = SYSTEM_PERMISSIONS.map((perm, index) => ({
        id: index + 1,
        name: perm.name,
        slug: perm.slug,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        isSystemPermission: true,
        category: perm.category,
        createdAt: new Date().toISOString()
      }));

      setRoles(mockRoles);
      setPermissions(mockPermissions);
      setUserPermissions([]); // Mock empty for now

      console.log('✅ Permission data loaded:', {
        roles: mockRoles.length,
        permissions: mockPermissions.length
      });
    } catch (error) {
      console.error('Load data error:', error);
      setError('Veriler yüklenemedi');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!createRoleForm.name.trim() || !createRoleForm.slug.trim()) {
      setError('Role adı ve slug gerekli');
      return;
    }

    try {
      // TODO: Implement role creation with RBACService
      setMessage(`✅ ${createRoleForm.name} rolü oluşturuldu`);
      setCreateRoleForm({
        name: '',
        slug: '',
        description: '',
        level: 5,
        parentRoleId: ''
      });
      setShowCreateRoleForm(false);
      await loadData();
    } catch (error) {
      console.error('Create role error:', error);
      setError('Rol oluşturulurken hata oluştu');
    }
  };

  const handleAssignPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!assignPermissionForm.userId || !assignPermissionForm.permissionId) {
      setError('Kullanıcı ve yetki seçimi gerekli');
      return;
    }

    try {
      const user = UnifiedLoginService.getCurrentUser();
      if (!user?.id) return;

      const success = await RBACService.grantPermission(
        parseInt(assignPermissionForm.userId),
        parseInt(assignPermissionForm.permissionId),
        user.id,
        undefined, // conditions
        assignPermissionForm.resourceId ? parseInt(assignPermissionForm.resourceId) : undefined,
        assignPermissionForm.expiresAt ? new Date(assignPermissionForm.expiresAt) : undefined
      );

      if (success) {
        setMessage('✅ Yetki başarıyla atandı');
        setAssignPermissionForm({
          userId: '',
          roleId: '',
          permissionId: '',
          granted: true,
          resourceId: '',
          expiresAt: ''
        });
        setShowAssignPermissionForm(false);
        await loadData();
      } else {
        setError('Yetki atanamadı');
      }
    } catch (error) {
      console.error('Assign permission error:', error);
      setError('Yetki atanırken hata oluştu');
    }
  };

  const getRoleHierarchyDisplay = (role: Role): string => {
    const indent = '  '.repeat(role.level - 1);
    return `${indent}${role.name} (Level ${role.level})`;
  };

  const getPermissionCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      system: 'bg-red-100 text-red-800',
      company_management: 'bg-blue-100 text-blue-800',
      project_management: 'bg-green-100 text-green-800',
      user_management: 'bg-purple-100 text-purple-800',
      education_management: 'bg-yellow-100 text-yellow-800',
      event_management: 'bg-pink-100 text-pink-800',
      content_management: 'bg-indigo-100 text-indigo-800',
      reporting: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
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
    <PermissionGuardComponent 
      permission="permissions.manage"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">
              <i className="ri-shield-cross-line"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Yetkisiz Erişim</h1>
            <p className="text-gray-600 mb-4">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
            <Link
              href="/admin-dashboard"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <i className="ri-arrow-left-line"></i>
              <span>Dashboard'a Dön</span>
            </Link>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 font-['Pacifico']">
                Admin Panel
              </Link>
              <span className="text-gray-300">→</span>
              <h1 className="text-xl font-semibold text-gray-900">Yetki Yönetimi</h1>
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
                  onClick={() => setActiveTab('roles')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'roles'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <i className="ri-shield-user-line mr-2"></i>
                  Roller ({roles.length})
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'permissions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <i className="ri-key-line mr-2"></i>
                  Yetkiler ({permissions.length})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <i className="ri-user-settings-line mr-2"></i>
                  Kullanıcı Yetkileri
                </button>
              </div>
              
              <div className="flex space-x-2">
                {activeTab === 'roles' && (
                  <PermissionButton
                    permission="roles.manage"
                    onClick={() => setShowCreateRoleForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <i className="ri-add-line"></i>
                    <span>Yeni Rol</span>
                  </PermissionButton>
                )}
                
                <PermissionButton
                  permission="permissions.manage"
                  onClick={() => setShowAssignPermissionForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <i className="ri-user-add-line"></i>
                  <span>Yetki Ata</span>
                </PermissionButton>
              </div>
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

            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Sistem Rolleri</h2>
                  <p className="text-sm text-gray-600 mt-1">Hiyerarşik rol yapısı ve yetki devralma</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol Hiyerarşisi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Açıklama
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kullanıcı Sayısı
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
                      {roles.map((role) => (
                        <tr key={role.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-3 bg-blue-${role.level * 100}`}></div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getRoleHierarchyDisplay(role)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {role.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {role.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {role.userCount || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              role.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {role.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                            {role.isSystemRole && (
                              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Sistem
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <PermissionButton
                              permission="roles.manage"
                              onClick={() => setSelectedRole(role)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <i className="ri-edit-line"></i>
                            </PermissionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Sistem Yetkileri</h2>
                  <p className="text-sm text-gray-600 mt-1">Kaynak ve aksiyon bazlı izin kontrolü</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yetki
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kaynak
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksiyon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategori
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Açıklama
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permission.slug}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {permission.resource}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {permission.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getPermissionCategoryColor(permission.category)
                            }`}>
                              {permission.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {permission.description}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Kullanıcı Yetkileri</h2>
                  <p className="text-sm text-gray-600 mt-1">Kullanıcılara atanmış roller ve özel yetkiler</p>
                </div>
                
                <div className="p-6 text-center text-gray-500">
                  <i className="ri-user-settings-line text-4xl mb-4"></i>
                  <p>Kullanıcı yetki atamaları için geliştirme aşamasında</p>
                  <p className="text-sm mt-2">Bu özellik Phase 2.6'da aktif hale gelecek</p>
                </div>
              </div>
            )}

            {/* Create Role Modal */}
            {showCreateRoleForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-medium text-gray-900">Yeni Rol Oluştur</h3>
                      <button
                        onClick={() => setShowCreateRoleForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>

                    <form onSubmit={handleCreateRole} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rol Adı *
                        </label>
                        <input
                          type="text"
                          value={createRoleForm.name}
                          onChange={(e) => setCreateRoleForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Slug *
                        </label>
                        <input
                          type="text"
                          value={createRoleForm.slug}
                          onChange={(e) => setCreateRoleForm(prev => ({ ...prev, slug: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="custom_role"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Açıklama
                        </label>
                        <textarea
                          value={createRoleForm.description}
                          onChange={(e) => setCreateRoleForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hiyerarşi Seviyesi
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={createRoleForm.level}
                          onChange={(e) => setCreateRoleForm(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">1 = En yüksek yetki, 10 = En düşük yetki</p>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowCreateRoleForm(false)}
                          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                          Rol Oluştur
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Assign Permission Modal */}
            {showAssignPermissionForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-medium text-gray-900">Yetki Ata</h3>
                      <button
                        onClick={() => setShowAssignPermissionForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>

                    <form onSubmit={handleAssignPermission} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kullanıcı ID *
                        </label>
                        <input
                          type="number"
                          value={assignPermissionForm.userId}
                          onChange={(e) => setAssignPermissionForm(prev => ({ ...prev, userId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Yetki *
                        </label>
                        <select
                          value={assignPermissionForm.permissionId}
                          onChange={(e) => setAssignPermissionForm(prev => ({ ...prev, permissionId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Yetki seçin</option>
                          {permissions.map((permission) => (
                            <option key={permission.id} value={permission.id}>
                              {permission.name} ({permission.slug})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kaynak ID (Opsiyonel)
                        </label>
                        <input
                          type="number"
                          value={assignPermissionForm.resourceId}
                          onChange={(e) => setAssignPermissionForm(prev => ({ ...prev, resourceId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Belirli bir kaynağa özel"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Son Geçerlilik Tarihi (Opsiyonel)
                        </label>
                        <input
                          type="datetime-local"
                          value={assignPermissionForm.expiresAt}
                          onChange={(e) => setAssignPermissionForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowAssignPermissionForm(false)}
                          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                          Yetki Ata
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
    </PermissionGuardComponent>
  );
}
