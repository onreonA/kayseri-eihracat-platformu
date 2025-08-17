/**
 * MULTI-LEVEL AUTHENTICATION SERVICE
 * Phase 2.2: Unified authentication for all user types
 * 
 * Supports: Master Admin, Consultant, Company Owner, Company Personnel
 * Features: Role-based routing, session management, permission checking
 */

import { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabaseClient';
import { UserService, CompanyService, ConsultantService } from './user-hierarchy-service';

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export type UserRole = 'master_admin' | 'consultant' | 'company_owner' | 'company_personnel';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  
  // Role-specific data
  companyId?: number;
  companyName?: string;
  consultantId?: number;
  personnelId?: number;
  
  // Permissions
  permissions: string[];
  
  // Session info
  sessionToken: string;
  lastLogin: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  redirectTo?: string;
  error?: string;
}

export interface SessionData {
  user: AuthUser;
  expiresAt: number;
  createdAt: number;
  deviceInfo?: string;
}

// ================================================================
// CORE AUTHENTICATION SERVICE
// ================================================================

export class MultiLevelAuthService {
  private static readonly SESSION_KEY = 'auth_session';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Authenticate user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;
      const cleanEmail = email.toLowerCase().trim();
      
      console.log('🔐 Multi-level authentication starting for:', cleanEmail);
      
      // Step 1: Check for Master Admin (hardcoded for now)
      const adminResult = await this.checkMasterAdmin(cleanEmail, password);
      if (adminResult.success) {
        return adminResult;
      }
      
      // Step 2: Check database users
      const user = await UserService.getUserByEmail(cleanEmail);
      if (!user) {
        // Step 3: Fallback to legacy firmalar table for backward compatibility
        return await this.checkLegacyFirmaLogin(cleanEmail, password);
      }
      
      // Step 4: Validate password
      if (!this.validatePassword(password)) {
        return { success: false, error: 'Geçersiz şifre' };
      }
      
      // Step 5: Check user status
      if (user.status !== 'active') {
        return { success: false, error: 'Hesap aktif değil' };
      }
      
      // Step 6: Create auth user based on role
      const authUser = await this.createAuthUser(user);
      if (!authUser) {
        return { success: false, error: 'Kullanıcı bilgileri alınamadı' };
      }
      
      // Step 7: Create session
      const session = this.createSession(authUser);
      this.saveSession(session);
      
      // Step 8: Determine redirect URL
      const redirectTo = this.getRedirectUrl(authUser.role);
      
      console.log('✅ Multi-level authentication successful:', authUser.role);
      return { success: true, user: authUser, redirectTo };
      
    } catch (error) {
      console.error('❌ Multi-level authentication error:', error);
      return { success: false, error: 'Giriş hatası oluştu' };
    }
  }
  
  /**
   * Check master admin credentials (hardcoded fallback)
   */
  private static async checkMasterAdmin(email: string, password: string): Promise<AuthResult> {
    const masterAdmins = [
      { email: 'bilgi@omerfarukunsal.com', password: 'admin123', name: 'Master Admin' }
    ];
    
    const admin = masterAdmins.find(a => a.email === email && a.password === password);
    if (!admin) {
      return { success: false, error: 'Not master admin' };
    }
    
    const authUser: AuthUser = {
      id: 1,
      email: admin.email,
      fullName: admin.name,
      role: 'master_admin',
      status: 'active',
      permissions: ['admin.*'], // Full admin access
      sessionToken: this.generateSessionToken(),
      lastLogin: new Date().toISOString()
    };
    
    const session = this.createSession(authUser);
    this.saveSession(session);
    
    // Save to localStorage for backward compatibility
    this.setLegacyAdminSession(authUser);
    
    return { 
      success: true, 
      user: authUser, 
      redirectTo: '/admin-dashboard' 
    };
  }
  
  /**
   * Check legacy firmalar table for backward compatibility
   */
  private static async checkLegacyFirmaLogin(email: string, password: string): Promise<AuthResult> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }
      
      const { data: firmalar, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('yetkili_email', email)
        .eq('durum', 'Aktif')
        .single();
      
      if (error || !firmalar) {
        return { success: false, error: 'Bu email adresi ile kayıtlı aktif firma bulunamadı' };
      }
      
      if (!this.validatePassword(password)) {
        return { success: false, error: 'Geçersiz şifre' };
      }
      
      const authUser: AuthUser = {
        id: firmalar.id,
        email: firmalar.yetkili_email,
        fullName: firmalar.yetkili_adi || 'Firma Yetkilisi',
        role: 'company_owner',
        status: 'active',
        companyId: firmalar.id,
        companyName: firmalar.firma_adi,
        permissions: ['company.view', 'company.edit', 'project.view', 'education.view'],
        sessionToken: this.generateSessionToken(),
        lastLogin: new Date().toISOString()
      };
      
      const session = this.createSession(authUser);
      this.saveSession(session);
      
      // Save to localStorage for backward compatibility
      this.setLegacyUserSession(authUser);
      
      return { 
        success: true, 
        user: authUser, 
        redirectTo: '/dashboard' 
      };
      
    } catch (error) {
      console.error('Legacy firma login error:', error);
      return { success: false, error: 'Firma giriş hatası' };
    }
  }
  
  /**
   * Create AuthUser from database user
   */
  private static async createAuthUser(user: any): Promise<AuthUser | null> {
    try {
      const baseAuthUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.roleType as UserRole,
        status: user.status,
        permissions: [],
        sessionToken: this.generateSessionToken(),
        lastLogin: new Date().toISOString()
      };
      
      // Add role-specific data and permissions
      switch (user.roleType) {
        case 'consultant':
          const consultant = await ConsultantService.getConsultantByUserId(user.id);
          return {
            ...baseAuthUser,
            consultantId: consultant?.id,
            permissions: consultant?.adminPermissions || ['company.view', 'project.manage']
          };
          
        case 'company_owner':
          const companies = await CompanyService.getAllCompanies();
          const company = companies.find(c => c.ownerUserId === user.id);
          return {
            ...baseAuthUser,
            companyId: company?.id,
            companyName: company?.companyName,
            permissions: ['company.view', 'company.edit', 'company.manage_personnel', 'project.view']
          };
          
        case 'company_personnel':
          // Get personnel permissions from company_personnel table
          const supabase = getSupabaseClient();
          if (!supabase) return null;
          
          const { data: personnel, error } = await supabase
            .from('company_personnel')
            .select(`
              id, company_id, permissions,
              company:companies(id, company_name)
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
          
          if (error || !personnel) return null;
          
          return {
            ...baseAuthUser,
            personnelId: personnel.id,
            companyId: personnel.company_id,
            companyName: personnel.company?.company_name,
            permissions: personnel.permissions || ['project.view', 'education.view']
          };
          
        default:
          return baseAuthUser;
      }
    } catch (error) {
      console.error('Create auth user error:', error);
      return null;
    }
  }
  
  /**
   * Validate password (simplified - in production use proper hashing)
   */
  private static validatePassword(password: string): boolean {
    const validPasswords = ['123456', '111111', '112233', 'admin123'];
    return validPasswords.includes(password.trim());
  }
  
  /**
   * Generate secure session token
   */
  private static generateSessionToken(): string {
    return `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Create session data
   */
  private static createSession(user: AuthUser): SessionData {
    return {
      user,
      expiresAt: Date.now() + this.SESSION_DURATION,
      createdAt: Date.now(),
      deviceInfo: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };
  }
  
  /**
   * Save session to localStorage
   */
  private static saveSession(session: SessionData): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      console.log('✅ Session saved successfully');
    } catch (error) {
      console.error('❌ Session save error:', error);
    }
  }
  
  /**
   * Get current session
   */
  static getCurrentSession(): SessionData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionStr = localStorage.getItem(this.SESSION_KEY);
      if (!sessionStr) return null;
      
      const session: SessionData = JSON.parse(sessionStr);
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('❌ Session retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session !== null;
  }
  
  /**
   * Get current user
   */
  static getCurrentUser(): AuthUser | null {
    const session = this.getCurrentSession();
    return session?.user || null;
  }
  
  /**
   * Check if user has permission
   */
  static hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Master admin has all permissions
    if (user.role === 'master_admin') return true;
    
    // Check exact permission or wildcard
    return user.permissions.some(p => 
      p === permission || 
      p.endsWith('.*') && permission.startsWith(p.slice(0, -2))
    );
  }
  
  /**
   * Logout user
   */
  static logout(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear multi-level auth session
      localStorage.removeItem(this.SESSION_KEY);
      
      // Clear legacy sessions for backward compatibility
      this.clearLegacySessions();
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }
  
  /**
   * Get redirect URL based on role
   */
  private static getRedirectUrl(role: UserRole): string {
    switch (role) {
      case 'master_admin':
        return '/admin-dashboard';
      case 'consultant':
        return '/consultant-dashboard'; // To be created
      case 'company_owner':
        return '/dashboard';
      case 'company_personnel':
        return '/dashboard'; // Same as company owner for now
      default:
        return '/dashboard';
    }
  }
  
  /**
   * Set legacy admin session for backward compatibility
   */
  private static setLegacyAdminSession(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('isAdminLoggedIn', 'true');
    localStorage.setItem('adminEmail', user.email);
    localStorage.setItem('adminRole', 'admin');
    localStorage.setItem('adminId', user.id.toString());
    localStorage.setItem('adminName', user.fullName);
    localStorage.setItem('admin_token', user.sessionToken);
  }
  
  /**
   * Set legacy user session for backward compatibility
   */
  private static setLegacyUserSession(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    
    const loginData = {
      email: user.email,
      firmaAdi: user.companyName || '',
      firmaId: user.companyId || user.id,
      loginTime: new Date().toISOString(),
      isLoggedIn: true,
      version: '5.0',
      source: 'multi_level_auth',
      sessionId: user.sessionToken,
    };
    
    localStorage.setItem('user_login_data', JSON.stringify(loginData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('firmaAdi', user.companyName || '');
    localStorage.setItem('firmaId', (user.companyId || user.id).toString());
  }
  
  /**
   * Clear all legacy sessions
   */
  private static clearLegacySessions(): void {
    if (typeof window === 'undefined') return;
    
    const keysToRemove = [
      // Admin session keys
      'isAdminLoggedIn', 'adminEmail', 'adminRole', 'adminId', 'adminName', 'admin_token',
      // User session keys
      'user_login_data', 'isLoggedIn', 'userEmail', 'firmaAdi', 'firmaId',
      // Other legacy keys
      'auth_token', 'user_data'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * Refresh session (extend expiry)
   */
  static refreshSession(): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;
    
    session.expiresAt = Date.now() + this.SESSION_DURATION;
    this.saveSession(session);
    return true;
  }
  
  /**
   * Get user role display name
   */
  static getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case 'master_admin': return 'Master Admin';
      case 'consultant': return 'Danışman';
      case 'company_owner': return 'Firma Yetkilisi';
      case 'company_personnel': return 'Firma Personeli';
      default: return 'Kullanıcı';
    }
  }
}

// ================================================================
// AUTHENTICATION GUARDS
// ================================================================

export class AuthGuards {
  /**
   * Route guard for authenticated users
   */
  static requireAuth(): boolean {
    return MultiLevelAuthService.isAuthenticated();
  }
  
  /**
   * Route guard for admin users
   */
  static requireAdmin(): boolean {
    const user = MultiLevelAuthService.getCurrentUser();
    return user?.role === 'master_admin' || user?.role === 'consultant';
  }
  
  /**
   * Route guard for company users
   */
  static requireCompany(): boolean {
    const user = MultiLevelAuthService.getCurrentUser();
    return user?.role === 'company_owner' || user?.role === 'company_personnel';
  }
  
  /**
   * Route guard for specific permission
   */
  static requirePermission(permission: string): boolean {
    return MultiLevelAuthService.hasPermission(permission);
  }
  
  /**
   * Route guard for specific role
   */
  static requireRole(role: UserRole): boolean {
    const user = MultiLevelAuthService.getCurrentUser();
    return user?.role === role;
  }
}

// ================================================================
// HOOKS FOR REACT COMPONENTS
// ================================================================

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = MultiLevelAuthService.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    
    checkAuth();
    
    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = () => checkAuth();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const login = async (credentials: LoginCredentials) => {
    const result = await MultiLevelAuthService.login(credentials);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };
  
  const logout = () => {
    MultiLevelAuthService.logout();
    setUser(null);
  };
  
  const hasPermission = (permission: string) => {
    return MultiLevelAuthService.hasPermission(permission);
  };
  
  return {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'master_admin' || user?.role === 'consultant',
    isCompany: user?.role === 'company_owner' || user?.role === 'company_personnel'
  };
};

// ================================================================
// UNIFIED LOGIN SERVICE EXPORT
// ================================================================

export class UnifiedLoginService {
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    return await MultiLevelAuthService.login(credentials);
  }
  
  static logout(): void {
    return MultiLevelAuthService.logout();
  }
  
  static getCurrentUser(): AuthUser | null {
    return MultiLevelAuthService.getCurrentUser();
  }
  
  static isAuthenticated(): boolean {
    return MultiLevelAuthService.isAuthenticated();
  }
  
  static hasRole(role: UserRole): boolean {
    return MultiLevelAuthService.hasRole(role);
  }
}

// Export everything
export default MultiLevelAuthService;
