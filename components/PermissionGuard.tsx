'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PermissionGuard } from '@/lib/rbac-permission-system';

interface PermissionGuardProps {
  children: ReactNode;
  permission: string;
  permissions?: string[]; // Multiple permissions
  requireAll?: boolean; // true = AND logic, false = OR logic
  context?: Record<string, any>;
  fallback?: ReactNode;
  showLoader?: boolean;
}

interface ConditionalRenderProps {
  permission: string;
  permissions?: string[];
  requireAll?: boolean;
  context?: Record<string, any>;
  children: ReactNode;
}

/**
 * Permission Guard Component
 * Renders children only if user has required permissions
 */
export default function PermissionGuardComponent({
  children,
  permission,
  permissions,
  requireAll = true,
  context,
  fallback = null,
  showLoader = true
}: PermissionGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, [permission, permissions, requireAll, JSON.stringify(context)]); // Stabilize context dependency

  const checkPermissions = async () => {
    try {
      setLoading(true);
      
      let hasPermission = false;

      // Add caching for component-level permission checks
      const cacheKey = `component:${permission || permissions?.join(',')}:${JSON.stringify(context)}`;
      const cachedResult = sessionStorage.getItem(cacheKey);
      
      if (cachedResult) {
        const { result, timestamp } = JSON.parse(cachedResult);
        const cacheAge = Date.now() - timestamp;
        
        // Use cached result if less than 1 minute old
        if (cacheAge < 60000) {
          setHasAccess(result);
          setLoading(false);
          return;
        }
      }

      if (permissions && permissions.length > 0) {
        // Multiple permissions check
        if (requireAll) {
          hasPermission = await PermissionGuard.canAccessAll(permissions, context);
        } else {
          hasPermission = await PermissionGuard.canAccessAny(permissions, context);
        }
      } else if (permission) {
        // Single permission check
        hasPermission = await PermissionGuard.canAccess(permission, context);
      }

      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        result: hasPermission,
        timestamp: Date.now()
      }));

      setHasAccess(hasPermission);
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Show loader while checking permissions
  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show fallback or nothing if no access
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  // Render children if user has access
  return <>{children}</>;
}

/**
 * Conditional Render Hook for inline permission checks
 */
export function ConditionalRender({
  permission,
  permissions,
  requireAll = true,
  context,
  children
}: ConditionalRenderProps) {
  return (
    <PermissionGuardComponent
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      context={context}
      showLoader={false}
    >
      {children}
    </PermissionGuardComponent>
  );
}

/**
 * Permission-based Navigation Item
 */
interface PermissionNavItemProps {
  permission: string;
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PermissionNavItem({
  permission,
  href,
  icon,
  label,
  active = false,
  onClick,
  className = ''
}: PermissionNavItemProps) {
  return (
    <PermissionGuardComponent permission={permission} showLoader={false}>
      <a
        href={href}
        onClick={onClick}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        } ${className}`}
      >
        <i className={icon}></i>
        <span className="text-sm font-medium">{label}</span>
      </a>
    </PermissionGuardComponent>
  );
}

/**
 * Permission-based Button
 */
interface PermissionButtonProps {
  permission: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PermissionButton({
  permission,
  onClick,
  children,
  className = '',
  disabled = false,
  variant = 'primary'
}: PermissionButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <PermissionGuardComponent permission={permission} showLoader={false}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          variantClasses[variant]
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {children}
      </button>
    </PermissionGuardComponent>
  );
}

/**
 * Resource-specific Permission Guard
 */
interface ResourcePermissionGuardProps {
  resource: string;
  action: string;
  resourceId?: number;
  children: ReactNode;
  fallback?: ReactNode;
  context?: Record<string, any>;
}

export function ResourcePermissionGuard({
  resource,
  action,
  resourceId,
  children,
  fallback = null,
  context
}: ResourcePermissionGuardProps) {
  return (
    <PermissionGuardComponent
      permission={`${resource}.${action}`}
      context={{ ...context, resourceId }}
      fallback={fallback}
    >
      {children}
    </PermissionGuardComponent>
  );
}

/**
 * Role-based Component Guard
 */
interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallback = null
}: RoleGuardProps) {
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, [allowedRoles]);

  const checkRole = async () => {
    try {
      setLoading(true);
      
      // Get current user from unified login service
      const { UnifiedLoginService } = await import('@/lib/multi-level-auth');
      const currentUser = UnifiedLoginService.getCurrentUser();
      
      if (!currentUser) {
        setHasRole(false);
        return;
      }

      // Check if user has any of the allowed roles
      const hasAccess = allowedRoles.includes(currentUser.userType);
      setHasRole(hasAccess);
    } catch (error) {
      console.error('Role check failed:', error);
      setHasRole(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Permission Guard Hooks
 */
export function usePermission(permission: string, context?: Record<string, any>) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setLoading(true);
        const access = await PermissionGuard.canAccess(permission, context);
        setHasAccess(access);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permission, context]);

  return { hasAccess, loading };
}

export function usePermissions(permissions: string[], requireAll: boolean = true, context?: Record<string, any>) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setLoading(true);
        let access = false;
        
        if (requireAll) {
          access = await PermissionGuard.canAccessAll(permissions, context);
        } else {
          access = await PermissionGuard.canAccessAny(permissions, context);
        }
        
        setHasAccess(access);
      } catch (error) {
        console.error('Permissions check failed:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [permissions, requireAll, context]);

  return { hasAccess, loading };
}

/**
 * Permission Debug Component (Development only)
 */
interface PermissionDebugProps {
  userId: number;
  permissions: string[];
}

export function PermissionDebug({ userId, permissions }: PermissionDebugProps) {
  const [results, setResults] = useState<Record<string, any>>({});

  useEffect(() => {
    const checkDebugPermissions = async () => {
      try {
        const { RBACService } = await import('@/lib/rbac-permission-system');
        const permissionResults = await RBACService.hasPermissions(userId, permissions);
        setResults(permissionResults);
      } catch (error) {
        console.error('Debug permission check failed:', error);
      }
    };

    if (process.env.NODE_ENV === 'development') {
      checkDebugPermissions();
    }
  }, [userId, permissions]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Permission Debug</h4>
      <div className="space-y-1">
        {Object.entries(results).map(([permission, result]) => (
          <div key={permission} className="flex justify-between">
            <span className="truncate">{permission}:</span>
            <span className={result.granted ? 'text-green-400' : 'text-red-400'}>
              {result.granted ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export all components and hooks
export {
  PermissionGuardComponent as PermissionGuardComponent,
  ConditionalRender,
  PermissionNavItem,
  PermissionButton,
  ResourcePermissionGuard,
  RoleGuard,
  usePermission,
  usePermissions,
  PermissionDebug
};
