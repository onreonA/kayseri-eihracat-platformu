'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MultiLevelAuthService, AuthGuards, type UserRole } from '@/lib/multi-level-auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireCompany?: boolean;
  requireRole?: UserRole;
  requirePermission?: string;
  fallbackUrl?: string;
  showLoading?: boolean;
}

export default function AuthGuard({
  children,
  requireAuth = false,
  requireAdmin = false,
  requireCompany = false,
  requireRole,
  requirePermission,
  fallbackUrl = '/login',
  showLoading = true
}: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = () => {
    try {
      // Check basic authentication
      if (requireAuth && !AuthGuards.requireAuth()) {
        console.log('🚫 Auth required but user not authenticated');
        redirectToLogin();
        return;
      }

      // Check admin access
      if (requireAdmin && !AuthGuards.requireAdmin()) {
        console.log('🚫 Admin access required but user is not admin');
        redirectToLogin('/admin-login');
        return;
      }

      // Check company access
      if (requireCompany && !AuthGuards.requireCompany()) {
        console.log('🚫 Company access required but user is not company member');
        redirectToLogin();
        return;
      }

      // Check specific role
      if (requireRole && !AuthGuards.requireRole(requireRole)) {
        console.log('🚫 Specific role required:', requireRole);
        redirectToLogin();
        return;
      }

      // Check specific permission
      if (requirePermission && !AuthGuards.requirePermission(requirePermission)) {
        console.log('🚫 Permission required:', requirePermission);
        redirectToLogin();
        return;
      }

      // All checks passed
      console.log('✅ Authorization checks passed');
      setAuthorized(true);
    } catch (error) {
      console.error('❌ Authorization check error:', error);
      redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = (customUrl?: string) => {
    const redirectUrl = customUrl || fallbackUrl;
    console.log('🔄 Redirecting to:', redirectUrl);
    router.replace(redirectUrl);
  };

  if (loading && showLoading) {
    return <AuthLoadingScreen />;
  }

  if (!authorized) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

// ================================================================
// SPECIALIZED GUARDS
// ================================================================

// Admin Only Guard
export const AdminGuard = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requireAdmin fallbackUrl="/admin-login">
    {children}
  </AuthGuard>
);

// Company Only Guard
export const CompanyGuard = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requireCompany fallbackUrl="/login">
    {children}
  </AuthGuard>
);

// Master Admin Only Guard
export const MasterAdminGuard = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requireRole="master_admin" fallbackUrl="/admin-login">
    {children}
  </AuthGuard>
);

// Consultant Guard
export const ConsultantGuard = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requireRole="consultant" fallbackUrl="/admin-login">
    {children}
  </AuthGuard>
);

// Permission-based Guard
export const PermissionGuard = ({ 
  permission, 
  children,
  fallback
}: { 
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const hasPermission = MultiLevelAuthService.hasPermission(permission);
  
  if (!hasPermission) {
    return fallback || <PermissionDeniedScreen permission={permission} />;
  }
  
  return <>{children}</>;
};

// ================================================================
// LOADING AND ERROR SCREENS
// ================================================================

const AuthLoadingScreen = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Yetki kontrolü yapılıyor...</p>
    </div>
  </div>
);

const PermissionDeniedScreen = ({ permission }: { permission: string }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="max-w-md w-full mx-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-red-600 text-2xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h2>
        <p className="text-gray-600 mb-4">
          Bu sayfaya erişim için gerekli yetkiniz bulunmuyor.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Gerekli yetki: <code className="bg-gray-100 px-2 py-1 rounded">{permission}</code>
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Geri Dön
        </button>
      </div>
    </div>
  </div>
);

// ================================================================
// HIGHER ORDER COMPONENT
// ================================================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  guards: Omit<AuthGuardProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthGuard {...guards}>
      <Component {...props} />
    </AuthGuard>
  );
  
  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// ================================================================
// HOOK FOR COMPONENT-LEVEL CHECKS
// ================================================================

export const useAuthGuard = () => {
  const user = MultiLevelAuthService.getCurrentUser();
  
  return {
    user,
    isAuthenticated: MultiLevelAuthService.isAuthenticated(),
    isAdmin: AuthGuards.requireAdmin(),
    isCompany: AuthGuards.requireCompany(),
    hasRole: (role: UserRole) => AuthGuards.requireRole(role),
    hasPermission: (permission: string) => AuthGuards.requirePermission(permission),
    requireAuth: () => AuthGuards.requireAuth(),
    getRoleDisplayName: () => user ? MultiLevelAuthService.getRoleDisplayName(user.role) : ''
  };
};

// ================================================================
// USAGE EXAMPLES
// ================================================================

/*
// Basic authentication requirement
<AuthGuard requireAuth>
  <Dashboard />
</AuthGuard>

// Admin only
<AdminGuard>
  <AdminPanel />
</AdminGuard>

// Specific permission
<PermissionGuard permission="company.edit">
  <CompanyEditForm />
</PermissionGuard>

// Higher Order Component
const ProtectedAdminPage = withAuth(AdminPage, { requireAdmin: true });

// Hook usage
const MyComponent = () => {
  const { hasPermission, isAdmin } = useAuthGuard();
  
  return (
    <div>
      {isAdmin && <AdminControls />}
      {hasPermission('company.edit') && <EditButton />}
    </div>
  );
};
*/
