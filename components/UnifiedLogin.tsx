'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MultiLevelAuthService, type LoginCredentials } from '@/lib/multi-level-auth';

interface UnifiedLoginProps {
  mode?: 'admin' | 'user';
  redirectTo?: string;
}

export default function UnifiedLogin({ mode = 'user', redirectTo }: UnifiedLoginProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      setError('Email ve şifre alanları zorunludur.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Unified login attempting...', { email: credentials.email, mode });
      
      const result = await MultiLevelAuthService.login(credentials);
      
      if (result.success && result.user) {
        console.log('✅ Login successful:', result.user.role);
        
        // Use provided redirect or default based on role
        const finalRedirect = redirectTo || result.redirectTo || '/dashboard';
        router.push(finalRedirect);
      } else {
        setError(result.error || 'Giriş başarısız');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('Giriş hatası oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user types
  };

  const isAdminMode = mode === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className={`${isAdminMode ? 'ri-shield-user-line' : 'ri-user-line'} text-white text-2xl`}></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isAdminMode ? 'Admin Girişi' : 'Kullanıcı Girişi'}
            </h1>
            <p className="text-gray-400">
              {isAdminMode ? 'Yönetim paneline erişim' : 'Hesabınıza giriş yapın'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
              <div className="flex items-center space-x-2">
                <i className="ri-error-warning-line text-red-400"></i>
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                placeholder={isAdminMode ? "bilgi@omerfarukunsal.com" : "firma@example.com"}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                placeholder={isAdminMode ? "admin123" : "123456"}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <i className="ri-login-box-line"></i>
                  <span>{isAdminMode ? 'Admin Girişi' : 'Giriş Yap'}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              {isAdminMode 
                ? 'Bu panel sadece yönetici yetkisi olan hesaplar için çalışır.'
                : 'Hesabınız yok mu? Lütfen yönetici ile iletişime geçin.'
              }
            </p>
          </div>

          {/* Mode Switch Link */}
          <div className="mt-6 text-center">
            <Link 
              href={isAdminMode ? '/login' : '/admin-login'} 
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              {isAdminMode ? 'Kullanıcı girişi' : 'Admin girişi'}
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// USAGE EXAMPLES
// ================================================================

// For admin login page
export const AdminLoginPage = () => (
  <UnifiedLogin mode="admin" />
);

// For user login page  
export const UserLoginPage = () => (
  <UnifiedLogin mode="user" />
);

// For custom redirect
export const CustomLogin = ({ redirectTo }: { redirectTo: string }) => (
  <UnifiedLogin redirectTo={redirectTo} />
);
