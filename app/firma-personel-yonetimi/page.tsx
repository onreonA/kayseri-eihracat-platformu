'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ModernLayout } from '@/components/Layout/ModernLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CompanyPersonnelService, CompanyPersonnel, PersonnelInvitation, ALL_PERSONNEL_PERMISSIONS, PersonnelPermissionHelper } from '@/lib/company-personnel-service';
import { UnifiedLoginService } from '@/lib/multi-level-auth';

export default function FirmaPersonelYonetimiPage() {
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<CompanyPersonnel[]>([]);
  const [invitations, setInvitations] = useState<PersonnelInvitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [companyInfo, setCompanyInfo] = useState<{
    currentCount: number;
    maxAllowed: number;
    canAdd: boolean;
  } | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    position: '',
    department: '',
    permissions: [] as string[]
  });

  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is company owner
      const user = UnifiedLoginService.getCurrentUser();
      if (!user || user.userType !== 'company_owner') {
        console.log('❌ Yetkisiz erişim - sadece firma sahipleri');
        router.push('/login');
        return;
      }

      await loadPersonnelData();
    } catch (error) {
      console.error('Auth/data loading error:', error);
      setError('Sistem hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonnelData = async () => {
    try {
      const user = UnifiedLoginService.getCurrentUser();
      if (!user?.companyId) return;

      // Load personnel
      const personnelData = await CompanyPersonnelService.getCompanyPersonnel(user.companyId);
      setPersonnel(personnelData);

      // Load invitations
      const invitationData = await CompanyPersonnelService.getCompanyInvitations(user.companyId);
      setInvitations(invitationData);

      // Check personnel limits
      const limits = await CompanyPersonnelService.canAddPersonnel(user.companyId);
      setCompanyInfo(limits);

      console.log('✅ Personnel data loaded:', {
        personnel: personnelData.length,
        invitations: invitationData.length,
        limits
      });
    } catch (error) {
      console.error('Load personnel data error:', error);
      setError('Personel verileri yüklenemedi');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!inviteForm.email.trim()) {
      setError('E-posta adresi gerekli');
      return;
    }

    if (inviteForm.permissions.length === 0) {
      setError('En az bir yetki seçmelisiniz');
      return;
    }

    try {
      const user = UnifiedLoginService.getCurrentUser();
      if (!user?.companyId || !user?.id) return;

      const invitation = await CompanyPersonnelService.invitePersonnel({
        companyId: user.companyId,
        email: inviteForm.email.trim(),
        position: inviteForm.position.trim() || undefined,
        department: inviteForm.department.trim() || undefined,
        permissions: inviteForm.permissions,
        invitedBy: user.id
      });

      if (invitation) {
        setMessage(`✅ ${inviteForm.email} adresine davet gönderildi`);
        setInviteForm({
          email: '',
          position: '',
          department: '',
          permissions: []
        });
        setShowInviteForm(false);
        await loadPersonnelData(); // Refresh data
      } else {
        setError('Davet gönderilemedi');
      }
    } catch (error) {
      console.error('Invite error:', error);
      setError('Davet gönderilirken hata oluştu');
    }
  };

  const handleRemovePersonnel = async (personnelId: number) => {
    if (!confirm('Bu personeli firmadan çıkarmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const success = await CompanyPersonnelService.removePersonnel(personnelId);
      if (success) {
        setMessage('✅ Personel başarıyla çıkarıldı');
        await loadPersonnelData();
      } else {
        setError('Personel çıkarılamadı');
      }
    } catch (error) {
      console.error('Remove personnel error:', error);
      setError('Personel çıkarılırken hata oluştu');
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      const success = await CompanyPersonnelService.cancelInvitation(invitationId);
      if (success) {
        setMessage('✅ Davet iptal edildi');
        await loadPersonnelData();
      } else {
        setError('Davet iptal edilemedi');
      }
    } catch (error) {
      console.error('Cancel invitation error:', error);
      setError('Davet iptal edilirken hata oluştu');
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setInviteForm(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending_invitation: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      active: 'Aktif',
      inactive: 'Pasif',
      pending_invitation: 'Davet Bekliyor'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getInvitationStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      pending: 'Beklemede',
      accepted: 'Kabul Edildi',
      expired: 'Süresi Doldu',
      cancelled: 'İptal Edildi'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Personel Yönetimi</h1>
            <p className="text-gray-600 mt-2">
              Firma personellerinizi yönetin ve yetkilendirin
            </p>
          </div>
          
          {companyInfo?.canAdd && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <i className="ri-user-add-line"></i>
              <span>Personel Davet Et</span>
            </button>
          )}
        </div>

        {/* Company Info */}
        {companyInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Personel Durumu</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {companyInfo.currentCount} / {companyInfo.maxAllowed} personel
                </p>
              </div>
              <div className="text-2xl text-blue-600">
                <i className="ri-team-line"></i>
              </div>
            </div>
            {!companyInfo.canAdd && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Maximum personel sayısına ulaştınız
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Personnel List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Mevcut Personel</h2>
          </div>
          
          {personnel.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <i className="ri-team-line text-4xl mb-4"></i>
              <p>Henüz personel bulunmuyor</p>
              <p className="text-sm mt-2">Personel davet ederek başlayın</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Personel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozisyon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yetkiler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Katılım Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {personnel.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {person.user?.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {person.user?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {person.position || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {person.department || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {person.permissions.length} yetki
                        </div>
                        <div className="text-xs text-gray-500">
                          {person.permissions.slice(0, 2).map(p => 
                            PersonnelPermissionHelper.getPermissionDisplayName(p)
                          ).join(', ')}
                          {person.permissions.length > 2 && '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(person.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(person.joinedAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRemovePersonnel(person.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <i className="ri-user-unfollow-line"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invitations List */}
        {invitations.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Bekleyen Davetler</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-posta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozisyon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Davet Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Son Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.position || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getInvitationStatusBadge(invitation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.invitedAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expiresAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {invitation.status === 'pending' && (
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite Form Modal */}
        {showInviteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Personel Davet Et</h3>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta Adresi *
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="personel@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pozisyon
                    </label>
                    <input
                      type="text"
                      value={inviteForm.position}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Proje Koordinatörü"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departman
                    </label>
                    <input
                      type="text"
                      value={inviteForm.department}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="İhracat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Yetkiler *
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {ALL_PERSONNEL_PERMISSIONS.map((permission) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={inviteForm.permissions.includes(permission)}
                            onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {PersonnelPermissionHelper.getPermissionDisplayName(permission)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Davet Gönder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
