'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedLoginService } from '@/lib/multi-level-auth';
import { PermissionGuard } from '@/lib/rbac-permission-system';

interface UserTypeSwitchProps {
  className?: string;
}

interface AvailableContext {
  userType: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  dashboardUrl: string;
  requiresPermission?: string;
}

export default function UserTypeSwitch({ className = '' }: UserTypeSwitchProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [availableContexts, setAvailableContexts] = useState<AvailableContext[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = UnifiedLoginService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await loadAvailableContexts(user);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadAvailableContexts = async (user: any) => {
    const contexts: AvailableContext[] = [];

    // Always available: Current user type
    contexts.push(getCurrentContextInfo(user.userType));

    // Additional contexts based on permissions
    if (await hasContextPermission('companies.view_all')) {
      if (user.userType !== 'master_admin') {
        contexts.push({
          userType: 'master_admin',
          label: 'Master Admin',
          description: 'Tam sistem yetkisi',
          icon: 'ri-admin-line',
          color: 'bg-red-500',
          dashboardUrl: '/admin-dashboard',
          requiresPermission: 'system.edit'
        });
      }
      if (user.userType !== 'admin') {
        contexts.push({
          userType: 'admin',
          label: 'Admin',
          description: 'Yönetici paneli',
          icon: 'ri-shield-user-line',
          color: 'bg-purple-500',
          dashboardUrl: '/admin-dashboard',
          requiresPermission: 'companies.view_all'
        });
      }
    }

    if (await hasContextPermission('companies.view_assigned')) {
      if (user.userType !== 'consultant') {
        contexts.push({
          userType: 'consultant',
          label: 'Danışman',
          description: 'Danışman görünümü',
          icon: 'ri-user-star-line',
          color: 'bg-blue-500',
          dashboardUrl: '/consultant-dashboard',
          requiresPermission: 'companies.view_assigned'
        });
      }
    }

    // Company contexts
    if (user.companyId && user.userType !== 'company_owner') {
      contexts.push({
        userType: 'company_owner',
        label: 'Firma Sahibi',
        description: 'Firma yönetim paneli',
        icon: 'ri-building-line',
        color: 'bg-green-500',
        dashboardUrl: '/dashboard'
      });
    }

    setAvailableContexts(contexts);
  };

  const getCurrentContextInfo = (userType: string): AvailableContext => {
    const contextMap: Record<string, AvailableContext> = {
      master_admin: {
        userType: 'master_admin',
        label: 'Master Admin',
        description: 'Tam sistem yetkisi',
        icon: 'ri-admin-line',
        color: 'bg-red-500',
        dashboardUrl: '/admin-dashboard'
      },
      admin: {
        userType: 'admin',
        label: 'Admin',
        description: 'Yönetici paneli',
        icon: 'ri-shield-user-line',
        color: 'bg-purple-500',
        dashboardUrl: '/admin-dashboard'
      },
      consultant: {
        userType: 'consultant',
        label: 'Danışman',
        description: 'Danışman paneli',
        icon: 'ri-user-star-line',
        color: 'bg-blue-500',
        dashboardUrl: '/consultant-dashboard'
      },
      company_owner: {
        userType: 'company_owner',
        label: 'Firma Sahibi',
        description: 'Firma yönetimi',
        icon: 'ri-building-line',
        color: 'bg-green-500',
        dashboardUrl: '/dashboard'
      },
      company_manager: {
        userType: 'company_manager',
        label: 'Firma Yöneticisi',
        description: 'Firma operasyonları',
        icon: 'ri-user-settings-line',
        color: 'bg-yellow-500',
        dashboardUrl: '/dashboard'
      },
      company_personnel: {
        userType: 'company_personnel',
        label: 'Firma Personeli',
        description: 'Personel paneli',
        icon: 'ri-user-line',
        color: 'bg-indigo-500',
        dashboardUrl: '/dashboard'
      }
    };

    return contextMap[userType] || {
      userType: 'guest',
      label: 'Misafir',
      description: 'Genel erişim',
      icon: 'ri-user-line',
      color: 'bg-gray-500',
      dashboardUrl: '/'
    };
  };

  const hasContextPermission = async (permission: string): Promise<boolean> => {
    try {
      return await PermissionGuard.canAccess(permission);
    } catch (error) {
      return false;
    }
  };

  const handleContextSwitch = async (context: AvailableContext) => {
    if (context.userType === currentUser?.userType) {
      setShowSwitcher(false);
      return;
    }

    try {
      setLoading(true);

      // Check permission if required
      if (context.requiresPermission) {
        const hasPermission = await hasContextPermission(context.requiresPermission);
        if (!hasPermission) {
          alert('Bu görünüme geçmek için yetkiniz yok.');
          return;
        }
      }

      // Create context switch session (temporary user type override)
      // Note: This is a UI/UX feature, not a security feature
      // Real permissions are still checked server-side
      localStorage.setItem('context_switch', JSON.stringify({
        originalUserType: currentUser.userType,
        currentContext: context.userType,
        switchedAt: new Date().toISOString()
      }));

      // Navigate to the context dashboard
      router.push(context.dashboardUrl);
      setShowSwitcher(false);

      // Refresh the current user info
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error('Context switch failed:', error);
      alert('Görünüm değiştirme başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const clearContextSwitch = () => {
    localStorage.removeItem('context_switch');
    window.location.reload();
  };

  if (!currentUser || availableContexts.length <= 1) {
    return null;
  }

  const currentContext = getCurrentContextInfo(currentUser.userType);
  const contextSwitchData = localStorage.getItem('context_switch');
  const isContextSwitched = contextSwitchData ? JSON.parse(contextSwitchData) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Context Switch Indicator */}
      {isContextSwitched && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="ri-refresh-line text-yellow-600"></i>
              <span className="text-sm text-yellow-800">
                Görünüm değiştirildi: {getCurrentContextInfo(isContextSwitched.currentContext).label}
              </span>
            </div>
            <button
              onClick={clearContextSwitch}
              className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
            >
              Geri Al
            </button>
          </div>
        </div>
      )}

      {/* Context Switcher Button */}
      <div className="relative">
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow w-full"
        >
          <div className={`w-10 h-10 ${currentContext.color} rounded-full flex items-center justify-center`}>
            <i className={`${currentContext.icon} text-white`}></i>
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-gray-900">{currentContext.label}</div>
            <div className="text-xs text-gray-500">{currentContext.description}</div>
          </div>
          <i className={`ri-arrow-${showSwitcher ? 'up' : 'down'}-s-line text-gray-400`}></i>
        </button>

        {/* Context Switch Dropdown */}
        {showSwitcher && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
                Mevcut Görünümler
              </div>
              {availableContexts.map((context) => {
                const isCurrent = context.userType === currentUser.userType;
                
                return (
                  <button
                    key={context.userType}
                    onClick={() => handleContextSwitch(context)}
                    disabled={loading || isCurrent}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      isCurrent 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-8 h-8 ${context.color} rounded-full flex items-center justify-center`}>
                      <i className={`${context.icon} text-white text-sm`}></i>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900 text-sm">{context.label}</div>
                      <div className="text-xs text-gray-500">{context.description}</div>
                    </div>
                    {isCurrent && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-white text-xs"></i>
                      </div>
                    )}
                    {loading && context.userType !== currentUser.userType && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="border-t border-gray-200 p-3">
              <div className="text-xs text-gray-500">
                <i className="ri-information-line mr-1"></i>
                Görünüm değiştirme sadece arayüzü etkiler. Yetkileriniz değişmez.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for getting current context
export function useUserContext() {
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    const updateContext = () => {
      const user = UnifiedLoginService.getCurrentUser();
      const contextSwitch = localStorage.getItem('context_switch');
      
      if (contextSwitch) {
        const switchData = JSON.parse(contextSwitch);
        setContext({
          ...user,
          userType: switchData.currentContext,
          originalUserType: switchData.originalUserType,
          isContextSwitched: true
        });
      } else {
        setContext(user);
      }
    };

    updateContext();
    
    // Listen for storage changes
    window.addEventListener('storage', updateContext);
    return () => window.removeEventListener('storage', updateContext);
  }, []);

  return context;
}

// Component for showing context-aware content
interface ContextAwareContentProps {
  userTypes: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ContextAwareContent({ 
  userTypes, 
  children, 
  fallback = null 
}: ContextAwareContentProps) {
  const context = useUserContext();
  
  if (!context || !userTypes.includes(context.userType)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
