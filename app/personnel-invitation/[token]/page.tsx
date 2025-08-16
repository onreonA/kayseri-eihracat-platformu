'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompanyPersonnelService, PersonnelInvitation } from '@/lib/company-personnel-service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Props {
  params: Promise<{ token: string }>;
}

export default function PersonnelInvitationPage({ params }: Props) {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<PersonnelInvitation | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      try {
        const resolvedParams = await params;
        setToken(resolvedParams.token);
        await loadInvitation(resolvedParams.token);
      } catch (error) {
        console.error('Failed to initialize page:', error);
        setError('Sayfa yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [params]);

  const loadInvitation = async (invitationToken: string) => {
    try {
      // Since we don't have a direct method to get invitation by token,
      // we'll need to implement this in the service or handle it differently
      // For now, we'll create a mock invitation to show the flow
      
      // TODO: Implement getInvitationByToken in CompanyPersonnelService
      console.log('Loading invitation for token:', invitationToken);
      
      // Mock invitation for demonstration
      const mockInvitation: PersonnelInvitation = {
        id: 1,
        companyId: 1,
        email: 'test@example.com',
        position: 'Proje Koordinatörü',
        department: 'İhracat',
        permissions: ['project.view', 'education.view'],
        invitedBy: 1,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        invitationToken: invitationToken,
        company: {
          id: 1,
          companyName: 'Örnek Firma A.Ş.'
        },
        inviter: {
          id: 1,
          fullName: 'Ahmet Yılmaz',
          email: 'ahmet@ornekfirma.com'
        }
      };

      setInvitation(mockInvitation);
    } catch (error) {
      console.error('Load invitation error:', error);
      setError('Davet bilgileri yüklenemedi');
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Form validation
    if (!formData.fullName.trim()) {
      setError('Ad Soyad gerekli');
      return;
    }

    if (!formData.password) {
      setError('Şifre gerekli');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }

    setProcessing(true);

    try {
      const result = await CompanyPersonnelService.acceptInvitation(token, {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password
      });

      if (result.success) {
        setSuccess('✅ Davet başarıyla kabul edildi! Giriş yapabilirsiniz.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login?type=personnel');
        }, 2000);
      } else {
        setError(result.error || 'Davet kabul edilemedi');
      }
    } catch (error) {
      console.error('Accept invitation error:', error);
      setError('Davet kabul edilirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Davet Bulunamadı</h1>
              <p className="text-gray-400 mb-6">{error}</p>
              <Link
                href="/"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <i className="ri-home-line"></i>
                <span>Ana Sayfaya Dön</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-time-line text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Davet Yükleniyor</h1>
              <p className="text-gray-400">Lütfen bekleyin...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if invitation is expired
  const isExpired = new Date(invitation.expiresAt) < new Date();

  if (isExpired || invitation.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-time-line text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Davet Geçersiz</h1>
              <p className="text-gray-400 mb-6">
                {isExpired ? 'Bu davet süresi dolmuş.' : 'Bu davet artık geçerli değil.'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <i className="ri-home-line"></i>
                <span>Ana Sayfaya Dön</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white cursor-pointer font-['Pacifico']">
            E-İhracat Platformu
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Giriş Yap
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-team-line text-white text-2xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Personel Davetini Kabul Et</h1>
              <p className="text-gray-400">
                {invitation.company?.companyName} firmasına katıl
              </p>
            </div>

            {/* Invitation Details */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-medium mb-3">Davet Detayları</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Firma:</span>
                  <span className="text-white">{invitation.company?.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">E-posta:</span>
                  <span className="text-white">{invitation.email}</span>
                </div>
                {invitation.position && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pozisyon:</span>
                    <span className="text-white">{invitation.position}</span>
                  </div>
                )}
                {invitation.department && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Departman:</span>
                    <span className="text-white">{invitation.department}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Davet Eden:</span>
                  <span className="text-white">{invitation.inviter?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Son Tarih:</span>
                  <span className="text-white">{new Date(invitation.expiresAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleAcceptInvitation} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                  Ad Soyad *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                  placeholder="Adınız Soyadınız"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Telefon
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                  placeholder="+90 (555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Şifre *
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                  placeholder="En az 6 karakter"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Şifre Tekrar *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                  placeholder="Şifrenizi tekrar girin"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                disabled={processing}
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <i className="ri-check-line text-lg"></i>
                    <span>Daveti Kabul Et</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Hesap oluşturarak{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Kullanım Şartları
                </a>
                {`'nı kabul etmiş olursunuz.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
