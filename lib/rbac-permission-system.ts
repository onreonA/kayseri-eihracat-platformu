/**
 * ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
 * Phase 2.5: Role-based permissions & access control
 * 
 * Features:
 * - Hierarchical role system with inheritance
 * - Resource-level permission control
 * - Dynamic permission assignment
 * - Permission caching for performance
 * - Audit logging for compliance
 * - Context-aware permissions
 */

import { getSupabaseClient } from './supabaseClient';
import { UnifiedLoginService } from './multi-level-auth';

// ================================================================
// CORE TYPE DEFINITIONS
// ================================================================

export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
  level: number; // Hierarchy level (1=highest, 10=lowest)
  parentRoleId?: number;
  isSystemRole: boolean; // Cannot be deleted
  status: 'active' | 'inactive' | 'deprecated';
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  parentRole?: Role;
  childRoles?: Role[];
  permissions?: RolePermission[];
  userCount?: number;
}

export interface Permission {
  id: number;
  name: string;
  slug: string; // e.g., 'companies.view', 'projects.edit'
  resource: string; // e.g., 'companies', 'projects', 'users'
  action: string; // e.g., 'view', 'edit', 'create', 'delete'
  description?: string;
  isSystemPermission: boolean;
  category: PermissionCategory;
  createdAt: string;
  
  // Context conditions (optional)
  conditions?: PermissionCondition[];
}

export interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
  granted: boolean; // true = grant, false = deny (explicit deny)
  conditions?: string; // JSON string of conditions
  grantedBy: number;
  grantedAt: string;
  
  // Related data
  role?: Role;
  permission?: Permission;
}

export interface UserPermission {
  id: number;
  userId: number;
  permissionId: number;
  granted: boolean;
  resourceId?: number; // Specific resource instance (e.g., specific company_id)
  conditions?: string;
  grantedBy: number;
  grantedAt: string;
  expiresAt?: string;
  
  // Related data
  user?: any;
  permission?: Permission;
}

export interface PermissionCondition {
  field: string; // e.g., 'company_id', 'project_status', 'time_range'
  operator: 'equals' | 'in' | 'not_in' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

export type PermissionCategory = 
  | 'system' 
  | 'company_management' 
  | 'project_management' 
  | 'education_management'
  | 'event_management'
  | 'user_management'
  | 'content_management'
  | 'reporting'
  | 'financial';

export interface PermissionContext {
  userId: number;
  userType: string;
  companyId?: number;
  projectId?: number;
  resourceId?: number;
  timeContext?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason: string;
  source: 'role' | 'user' | 'inherited' | 'condition' | 'denied';
  roleBasedPermissions?: string[];
  userSpecificPermissions?: string[];
  conditions?: PermissionCondition[];
  expiresAt?: string;
}

// ================================================================
// PREDEFINED SYSTEM ROLES
// ================================================================

export const SYSTEM_ROLES = [
  {
    name: 'Master Admin',
    slug: 'master_admin',
    description: 'Full system access with all permissions',
    level: 1,
    isSystemRole: true
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Administrative access with most permissions',
    level: 2,
    parentRoleSlug: 'master_admin',
    isSystemRole: true
  },
  {
    name: 'Consultant',
    slug: 'consultant',
    description: 'Consultant with assigned companies/projects',
    level: 3,
    parentRoleSlug: 'admin',
    isSystemRole: true
  },
  {
    name: 'Company Owner',
    slug: 'company_owner',
    description: 'Company management permissions',
    level: 4,
    isSystemRole: true
  },
  {
    name: 'Company Manager',
    slug: 'company_manager',
    description: 'Limited company management',
    level: 5,
    parentRoleSlug: 'company_owner',
    isSystemRole: true
  },
  {
    name: 'Company Personnel',
    slug: 'company_personnel',
    description: 'Basic company access',
    level: 6,
    parentRoleSlug: 'company_manager',
    isSystemRole: true
  },
  {
    name: 'Guest',
    slug: 'guest',
    description: 'Limited read-only access',
    level: 10,
    isSystemRole: true
  }
] as const;

// ================================================================
// PREDEFINED SYSTEM PERMISSIONS
// ================================================================

export const SYSTEM_PERMISSIONS = [
  // System Management
  { name: 'View System Settings', slug: 'system.view', resource: 'system', action: 'view', category: 'system' },
  { name: 'Edit System Settings', slug: 'system.edit', resource: 'system', action: 'edit', category: 'system' },
  { name: 'Manage Roles', slug: 'roles.manage', resource: 'roles', action: 'manage', category: 'system' },
  { name: 'Manage Permissions', slug: 'permissions.manage', resource: 'permissions', action: 'manage', category: 'system' },
  
  // Company Management
  { name: 'View All Companies', slug: 'companies.view_all', resource: 'companies', action: 'view_all', category: 'company_management' },
  { name: 'View Own Company', slug: 'companies.view_own', resource: 'companies', action: 'view_own', category: 'company_management' },
  { name: 'Create Companies', slug: 'companies.create', resource: 'companies', action: 'create', category: 'company_management' },
  { name: 'Edit All Companies', slug: 'companies.edit_all', resource: 'companies', action: 'edit_all', category: 'company_management' },
  { name: 'Edit Own Company', slug: 'companies.edit_own', resource: 'companies', action: 'edit_own', category: 'company_management' },
  { name: 'Delete Companies', slug: 'companies.delete', resource: 'companies', action: 'delete', category: 'company_management' },
  
  // Project Management
  { name: 'View All Projects', slug: 'projects.view_all', resource: 'projects', action: 'view_all', category: 'project_management' },
  { name: 'View Assigned Projects', slug: 'projects.view_assigned', resource: 'projects', action: 'view_assigned', category: 'project_management' },
  { name: 'Create Projects', slug: 'projects.create', resource: 'projects', action: 'create', category: 'project_management' },
  { name: 'Edit All Projects', slug: 'projects.edit_all', resource: 'projects', action: 'edit_all', category: 'project_management' },
  { name: 'Edit Assigned Projects', slug: 'projects.edit_assigned', resource: 'projects', action: 'edit_assigned', category: 'project_management' },
  { name: 'Delete Projects', slug: 'projects.delete', resource: 'projects', action: 'delete', category: 'project_management' },
  
  // User Management
  { name: 'View All Users', slug: 'users.view_all', resource: 'users', action: 'view_all', category: 'user_management' },
  { name: 'View Company Users', slug: 'users.view_company', resource: 'users', action: 'view_company', category: 'user_management' },
  { name: 'Create Users', slug: 'users.create', resource: 'users', action: 'create', category: 'user_management' },
  { name: 'Edit All Users', slug: 'users.edit_all', resource: 'users', action: 'edit_all', category: 'user_management' },
  { name: 'Edit Company Users', slug: 'users.edit_company', resource: 'users', action: 'edit_company', category: 'user_management' },
  { name: 'Delete Users', slug: 'users.delete', resource: 'users', action: 'delete', category: 'user_management' },
  
  // Education Management
  { name: 'View All Education', slug: 'education.view_all', resource: 'education', action: 'view_all', category: 'education_management' },
  { name: 'View Assigned Education', slug: 'education.view_assigned', resource: 'education', action: 'view_assigned', category: 'education_management' },
  { name: 'Participate Education', slug: 'education.participate', resource: 'education', action: 'participate', category: 'education_management' },
  { name: 'Create Education', slug: 'education.create', resource: 'education', action: 'create', category: 'education_management' },
  { name: 'Edit Education', slug: 'education.edit', resource: 'education', action: 'edit', category: 'education_management' },
  
  // Event Management
  { name: 'View All Events', slug: 'events.view_all', resource: 'events', action: 'view_all', category: 'event_management' },
  { name: 'View Public Events', slug: 'events.view_public', resource: 'events', action: 'view_public', category: 'event_management' },
  { name: 'Register Events', slug: 'events.register', resource: 'events', action: 'register', category: 'event_management' },
  { name: 'Create Events', slug: 'events.create', resource: 'events', action: 'create', category: 'event_management' },
  { name: 'Edit Events', slug: 'events.edit', resource: 'events', action: 'edit', category: 'event_management' },
  
  // Content Management
  { name: 'View Content', slug: 'content.view', resource: 'content', action: 'view', category: 'content_management' },
  { name: 'Create Content', slug: 'content.create', resource: 'content', action: 'create', category: 'content_management' },
  { name: 'Edit Content', slug: 'content.edit', resource: 'content', action: 'edit', category: 'content_management' },
  { name: 'Publish Content', slug: 'content.publish', resource: 'content', action: 'publish', category: 'content_management' },
  
  // Reporting
  { name: 'View All Reports', slug: 'reports.view_all', resource: 'reports', action: 'view_all', category: 'reporting' },
  { name: 'View Own Reports', slug: 'reports.view_own', resource: 'reports', action: 'view_own', category: 'reporting' },
  { name: 'Create Reports', slug: 'reports.create', resource: 'reports', action: 'create', category: 'reporting' },
  { name: 'Export Reports', slug: 'reports.export', resource: 'reports', action: 'export', category: 'reporting' },
] as const;

// ================================================================
// RBAC SERVICE CLASS
// ================================================================

export class RBACService {
  private static permissionCache = new Map<string, PermissionCheckResult>();
  private static cacheTimeout = 3 * 60 * 1000; // 3 minutes (reduced for better memory)
  private static maxCacheSize = 2000; // Limit cache size
  
  /**
   * Check if user has specific permission
   */
  static async hasPermission(
    userId: number, 
    permissionSlug: string, 
    context?: Partial<PermissionContext>
  ): Promise<PermissionCheckResult> {
    try {
      const cacheKey = `${userId}:${permissionSlug}:${JSON.stringify(context || {})}`;
      
      // Check cache first
      const cached = this.permissionCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await this.checkPermissionDirect(userId, permissionSlug, context);
      
      // Cache result with size limit
      this.setCachedResult(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Permission check error:', error);
      return {
        granted: false,
        reason: 'Permission check failed',
        source: 'denied'
      };
    }
  }
  
  /**
   * Check multiple permissions at once
   */
  static async hasPermissions(
    userId: number, 
    permissionSlugs: string[], 
    context?: Partial<PermissionContext>
  ): Promise<Record<string, PermissionCheckResult>> {
    const results: Record<string, PermissionCheckResult> = {};
    
    await Promise.all(
      permissionSlugs.map(async (slug) => {
        results[slug] = await this.hasPermission(userId, slug, context);
      })
    );
    
    return results;
  }
  
  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: number): Promise<{
    rolePermissions: string[];
    userPermissions: string[];
    allPermissions: string[];
  }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Get user roles and their permissions
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role:roles(
            id, slug, level,
            role_permissions(
              granted,
              permission:permissions(slug)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (rolesError) throw rolesError;

      // Get direct user permissions
      const { data: directPermissions, error: directError } = await supabase
        .from('user_permissions')
        .select(`
          granted,
          permission:permissions(slug)
        `)
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (directError) throw directError;

      // Process role permissions
      const rolePermissions: string[] = [];
      if (userRoles) {
        for (const userRole of userRoles) {
          if (userRole.role?.role_permissions) {
            for (const rolePerm of userRole.role.role_permissions) {
              if (rolePerm.granted && rolePerm.permission?.slug) {
                rolePermissions.push(rolePerm.permission.slug);
              }
            }
          }
        }
      }

      // Process direct permissions
      const userPermissions: string[] = [];
      if (directPermissions) {
        for (const userPerm of directPermissions) {
          if (userPerm.granted && userPerm.permission?.slug) {
            userPermissions.push(userPerm.permission.slug);
          }
        }
      }

      // Combine and deduplicate
      const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];

      return {
        rolePermissions,
        userPermissions,
        allPermissions
      };
    } catch (error) {
      console.error('Get user permissions error:', error);
      return {
        rolePermissions: [],
        userPermissions: [],
        allPermissions: []
      };
    }
  }
  
  /**
   * Assign role to user
   */
  static async assignRole(userId: number, roleId: number, assignedBy: number): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: assignedBy,
          status: 'active'
        });

      if (error) throw error;
      
      // Clear permission cache for user
      this.clearUserCache(userId);
      
      return true;
    } catch (error) {
      console.error('Assign role error:', error);
      return false;
    }
  }
  
  /**
   * Grant specific permission to user
   */
  static async grantPermission(
    userId: number, 
    permissionId: number, 
    grantedBy: number,
    conditions?: PermissionCondition[],
    resourceId?: number,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          permission_id: permissionId,
          granted: true,
          resource_id: resourceId,
          conditions: conditions ? JSON.stringify(conditions) : null,
          granted_by: grantedBy,
          expires_at: expiresAt?.toISOString()
        });

      if (error) throw error;
      
      // Clear permission cache for user
      this.clearUserCache(userId);
      
      return true;
    } catch (error) {
      console.error('Grant permission error:', error);
      return false;
    }
  }
  
  /**
   * Check permission with full context evaluation
   */
  private static async checkPermissionDirect(
    userId: number, 
    permissionSlug: string, 
    context?: Partial<PermissionContext>
  ): Promise<PermissionCheckResult> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Get permission ID
      const { data: permission, error: permError } = await supabase
        .from('permissions')
        .select('id, slug')
        .eq('slug', permissionSlug)
        .single();

      if (permError || !permission) {
        return {
          granted: false,
          reason: 'Permission not found',
          source: 'denied'
        };
      }

      // Check direct user permissions first
      const { data: userPerms, error: userPermError } = await supabase
        .from('user_permissions')
        .select('granted, conditions, expires_at')
        .eq('user_id', userId)
        .eq('permission_id', permission.id)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (userPermError) throw userPermError;

      // If user has explicit permission (grant or deny)
      if (userPerms && userPerms.length > 0) {
        const userPerm = userPerms[0];
        if (!userPerm.granted) {
          return {
            granted: false,
            reason: 'Explicitly denied by user permission',
            source: 'user'
          };
        }
        
        // Check conditions if any
        if (userPerm.conditions && context) {
          const conditionsMet = this.evaluateConditions(
            JSON.parse(userPerm.conditions), 
            context
          );
          if (!conditionsMet) {
            return {
              granted: false,
              reason: 'User permission conditions not met',
              source: 'condition'
            };
          }
        }
        
        return {
          granted: true,
          reason: 'Granted by user permission',
          source: 'user',
          expiresAt: userPerm.expires_at
        };
      }

      // Check role-based permissions
      const { data: rolePerms, error: rolePermError } = await supabase
        .from('user_roles')
        .select(`
          role:roles(
            id, slug, level,
            role_permissions!inner(
              granted, conditions,
              permission:permissions!inner(id, slug)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('role.role_permissions.permission.id', permission.id);

      if (rolePermError) throw rolePermError;

      // Check role permissions (highest level role wins)
      if (rolePerms && rolePerms.length > 0) {
        // Sort by role level (lower number = higher authority)
        const sortedRoles = rolePerms.sort((a, b) => 
          (a.role?.level || 10) - (b.role?.level || 10)
        );
        
        for (const userRole of sortedRoles) {
          const rolePerm = userRole.role?.role_permissions?.[0];
          if (rolePerm) {
            if (!rolePerm.granted) {
              return {
                granted: false,
                reason: `Denied by role: ${userRole.role?.slug}`,
                source: 'role'
              };
            }
            
            // Check role conditions
            if (rolePerm.conditions && context) {
              const conditionsMet = this.evaluateConditions(
                JSON.parse(rolePerm.conditions), 
                context
              );
              if (!conditionsMet) {
                continue; // Try next role
              }
            }
            
            return {
              granted: true,
              reason: `Granted by role: ${userRole.role?.slug}`,
              source: 'role'
            };
          }
        }
      }

      // Default deny
      return {
        granted: false,
        reason: 'No matching permissions found',
        source: 'denied'
      };
    } catch (error) {
      console.error('Direct permission check error:', error);
      return {
        granted: false,
        reason: 'Permission check failed',
        source: 'denied'
      };
    }
  }
  
  /**
   * Evaluate permission conditions
   */
  private static evaluateConditions(
    conditions: PermissionCondition[], 
    context: Partial<PermissionContext>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    
    for (const condition of conditions) {
      const contextValue = (context as any)[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          if (contextValue !== condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(contextValue)) return false;
          break;
        case 'not_in':
          if (Array.isArray(condition.value) && condition.value.includes(contextValue)) return false;
          break;
        case 'contains':
          if (!String(contextValue).includes(String(condition.value))) return false;
          break;
        case 'greater_than':
          if (contextValue <= condition.value) return false;
          break;
        case 'less_than':
          if (contextValue >= condition.value) return false;
          break;
        case 'between':
          if (!Array.isArray(condition.value) || condition.value.length !== 2) return false;
          if (contextValue < condition.value[0] || contextValue > condition.value[1]) return false;
          break;
        default:
          return false;
      }
    }
    
    return true;
  }
  
  /**
   * Set cached result with size management
   */
  private static setCachedResult(cacheKey: string, result: PermissionCheckResult): void {
    // Remove oldest entries if cache is full
    if (this.permissionCache.size >= this.maxCacheSize) {
      const oldestKey = this.permissionCache.keys().next().value;
      if (oldestKey) {
        this.permissionCache.delete(oldestKey);
      }
    }
    
    this.permissionCache.set(cacheKey, result);
    setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheTimeout);
  }
  
  /**
   * Clear permission cache for user
   */
  private static clearUserCache(userId: number): void {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.startsWith(`${userId}:`));
    
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }
  
  /**
   * Clear all permission cache
   */
  static clearCache(): void {
    this.permissionCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.permissionCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // Would need hit/miss tracking for accurate rate
    };
  }
}

// ================================================================
// PERMISSION GUARD UTILITIES
// ================================================================

export class PermissionGuard {
  /**
   * Frontend permission guard for components
   */
  static async canAccess(
    permissionSlug: string, 
    context?: Partial<PermissionContext>
  ): Promise<boolean> {
    try {
      const currentUser = UnifiedLoginService.getCurrentUser();
      if (!currentUser?.id) return false;
      
      const result = await RBACService.hasPermission(currentUser.id, permissionSlug, {
        ...context,
        userId: currentUser.id,
        userType: currentUser.userType,
        companyId: currentUser.companyId
      });
      
      return result.granted;
    } catch (error) {
      console.error('Permission guard error:', error);
      return false;
    }
  }
  
  /**
   * Multiple permissions check (AND logic)
   */
  static async canAccessAll(
    permissionSlugs: string[], 
    context?: Partial<PermissionContext>
  ): Promise<boolean> {
    const results = await Promise.all(
      permissionSlugs.map(slug => this.canAccess(slug, context))
    );
    return results.every(result => result);
  }
  
  /**
   * Multiple permissions check (OR logic)
   */
  static async canAccessAny(
    permissionSlugs: string[], 
    context?: Partial<PermissionContext>
  ): Promise<boolean> {
    const results = await Promise.all(
      permissionSlugs.map(slug => this.canAccess(slug, context))
    );
    return results.some(result => result);
  }
  
  /**
   * Resource-specific permission check
   */
  static async canAccessResource(
    resource: string,
    action: string,
    resourceId?: number,
    context?: Partial<PermissionContext>
  ): Promise<boolean> {
    const permissionSlug = `${resource}.${action}`;
    return this.canAccess(permissionSlug, {
      ...context,
      resourceId
    });
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

export const PermissionHelper = {
  /**
   * Get permission display name
   */
  getPermissionDisplayName: (permissionSlug: string): string => {
    const permission = SYSTEM_PERMISSIONS.find(p => p.slug === permissionSlug);
    return permission?.name || permissionSlug;
  },

  /**
   * Get permissions by category
   */
  getPermissionsByCategory: (category: PermissionCategory): typeof SYSTEM_PERMISSIONS => {
    return SYSTEM_PERMISSIONS.filter(p => p.category === category);
  },

  /**
   * Get role hierarchy
   */
  getRoleHierarchy: (): typeof SYSTEM_ROLES => {
    return SYSTEM_ROLES.sort((a, b) => a.level - b.level);
  },

  /**
   * Check if role can assign another role
   */
  canAssignRole: (assignerRoleLevel: number, targetRoleLevel: number): boolean => {
    return assignerRoleLevel < targetRoleLevel; // Lower level = higher authority
  },

  /**
   * Format permission conditions for display
   */
  formatConditions: (conditions: PermissionCondition[]): string => {
    if (!conditions || conditions.length === 0) return 'No conditions';
    
    return conditions.map(c => 
      `${c.field} ${c.operator} ${Array.isArray(c.value) ? c.value.join(', ') : c.value}`
    ).join(' AND ');
  }
};

export default RBACService;
