/**
 * COMPANY PERSONNEL SERVICE
 * Phase 2.3: Firma sub-user system (max 3 personnel)
 * 
 * Features:
 * - Company owners can add up to 3 personnel
 * - Email-based invitation system
 * - Permission management per personnel
 * - Role-based access control
 */

import { getSupabaseClient } from './supabaseClient';
import { UserService, CompanyService } from './user-hierarchy-service';

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface CompanyPersonnel {
  id: number;
  companyId: number;
  userId: number;
  position?: string;
  department?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending_invitation';
  joinedAt: string;
  invitedAt?: string;
  invitedBy?: number;
  
  // Related data
  user?: {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
    status: string;
  };
  company?: {
    id: number;
    companyName: string;
    maxPersonnel: number;
  };
}

export interface PersonnelInvitation {
  id: number;
  companyId: number;
  email: string;
  position?: string;
  department?: string;
  permissions: string[];
  invitedBy: number;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitationToken: string;
  
  // Related data
  company?: {
    id: number;
    companyName: string;
  };
  inviter?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface PersonnelPermissions {
  // Project permissions
  'project.view': boolean;
  'project.edit': boolean;
  'project.create': boolean;
  
  // Education permissions
  'education.view': boolean;
  'education.participate': boolean;
  
  // Event permissions
  'event.view': boolean;
  'event.register': boolean;
  
  // Forum permissions
  'forum.view': boolean;
  'forum.post': boolean;
  
  // Report permissions
  'report.view': boolean;
  'report.create': boolean;
}

export const DEFAULT_PERSONNEL_PERMISSIONS = [
  'project.view',
  'education.view', 
  'education.participate',
  'event.view',
  'event.register',
  'forum.view',
  'forum.post'
];

export const ALL_PERSONNEL_PERMISSIONS = [
  'project.view',
  'project.edit', 
  'project.create',
  'education.view',
  'education.participate',
  'event.view',
  'event.register',
  'forum.view',
  'forum.post',
  'report.view',
  'report.create'
];

// ================================================================
// COMPANY PERSONNEL SERVICE
// ================================================================

export class CompanyPersonnelService {
  
  /**
   * Get all personnel for a company
   */
  static async getCompanyPersonnel(companyId: number): Promise<CompanyPersonnel[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('company_personnel')
        .select(`
          id, company_id, user_id, position, department, permissions, status, joined_at,
          invited_at, invited_by,
          user:users(id, email, full_name, phone, status),
          company:companies(id, company_name, max_personnel)
        `)
        .eq('company_id', companyId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToPersonnel);
    } catch (error) {
      console.error('Get company personnel error:', error);
      return [];
    }
  }
  
  /**
   * Get personnel by user ID
   */
  static async getPersonnelByUserId(userId: number): Promise<CompanyPersonnel | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('company_personnel')
        .select(`
          id, company_id, user_id, position, department, permissions, status, joined_at,
          user:users(id, email, full_name, phone, status),
          company:companies(id, company_name, max_personnel)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return this.mapToPersonnel(data);
    } catch (error) {
      console.error('Get personnel by user ID error:', error);
      return null;
    }
  }
  
  /**
   * Check if company can add more personnel
   */
  static async canAddPersonnel(companyId: number): Promise<{
    canAdd: boolean;
    currentCount: number;
    maxAllowed: number;
    reason?: string;
  }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Get company info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('max_personnel')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      // Get current personnel count
      const { data: personnel, error: personnelError } = await supabase
        .from('company_personnel')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (personnelError) throw personnelError;

      const currentCount = personnel?.length || 0;
      const maxAllowed = company.max_personnel || 3;
      const canAdd = currentCount < maxAllowed;

      return {
        canAdd,
        currentCount,
        maxAllowed,
        reason: canAdd ? undefined : `Maximum ${maxAllowed} personnel allowed per company`
      };
    } catch (error) {
      console.error('Check personnel limit error:', error);
      return {
        canAdd: false,
        currentCount: 0,
        maxAllowed: 3,
        reason: 'Error checking personnel limit'
      };
    }
  }
  
  /**
   * Invite personnel to company
   */
  static async invitePersonnel(invitation: {
    companyId: number;
    email: string;
    position?: string;
    department?: string;
    permissions?: string[];
    invitedBy: number;
  }): Promise<PersonnelInvitation | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Check if company can add more personnel
      const canAdd = await this.canAddPersonnel(invitation.companyId);
      if (!canAdd.canAdd) {
        throw new Error(canAdd.reason);
      }

      // Check if email is already invited or is a personnel
      const existingPersonnel = await this.getPersonnelByEmail(invitation.companyId, invitation.email);
      if (existingPersonnel) {
        throw new Error('Bu email adresi zaten personel olarak kayıtlı');
      }

      const existingInvitation = await this.getActiveInvitation(invitation.companyId, invitation.email);
      if (existingInvitation) {
        throw new Error('Bu email adresine zaten davet gönderilmiş');
      }

      // Create invitation
      const invitationToken = this.generateInvitationToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { data, error } = await supabase
        .from('personnel_invitations')
        .insert({
          company_id: invitation.companyId,
          email: invitation.email.toLowerCase().trim(),
          position: invitation.position,
          department: invitation.department,
          permissions: invitation.permissions || DEFAULT_PERSONNEL_PERMISSIONS,
          invited_by: invitation.invitedBy,
          expires_at: expiresAt.toISOString(),
          invitation_token: invitationToken,
          status: 'pending'
        })
        .select(`
          id, company_id, email, position, department, permissions, invited_by,
          invited_at, expires_at, status, invitation_token,
          company:companies(id, company_name),
          inviter:users!invited_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      // Send invitation email (async)
      this.sendInvitationEmail(this.mapToInvitation(data))
        .catch(error => console.error('Failed to send invitation email:', error));

      return this.mapToInvitation(data);
    } catch (error) {
      console.error('Invite personnel error:', error);
      return null;
    }
  }
  
  /**
   * Accept personnel invitation
   */
  static async acceptInvitation(invitationToken: string, userData: {
    fullName: string;
    phone?: string;
    password: string;
  }): Promise<{
    success: boolean;
    personnel?: CompanyPersonnel;
    error?: string;
  }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Get invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('personnel_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        return { success: false, error: 'Geçersiz veya süresi dolmuş davet' };
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('personnel_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        
        return { success: false, error: 'Davet süresi dolmuş' };
      }

      // Check if company can still add personnel
      const canAdd = await this.canAddPersonnel(invitation.company_id);
      if (!canAdd.canAdd) {
        return { success: false, error: canAdd.reason };
      }

      // Create user account
      const user = await UserService.createUser({
        email: invitation.email,
        fullName: userData.fullName,
        phone: userData.phone,
        roleType: 'company_personnel',
        status: 'active'
      });

      if (!user) {
        return { success: false, error: 'Kullanıcı hesabı oluşturulamadı' };
      }

      // Create personnel record
      const { data: personnelData, error: personnelError } = await supabase
        .from('company_personnel')
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          position: invitation.position,
          department: invitation.department,
          permissions: invitation.permissions,
          status: 'active',
          invited_by: invitation.invited_by
        })
        .select(`
          id, company_id, user_id, position, department, permissions, status, joined_at,
          user:users(id, email, full_name, phone, status),
          company:companies(id, company_name, max_personnel)
        `)
        .single();

      if (personnelError) throw personnelError;

      // Mark invitation as accepted
      await supabase
        .from('personnel_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      return {
        success: true,
        personnel: this.mapToPersonnel(personnelData)
      };
    } catch (error) {
      console.error('Accept invitation error:', error);
      return { success: false, error: 'Davet kabul edilirken hata oluştu' };
    }
  }
  
  /**
   * Update personnel permissions
   */
  static async updatePersonnelPermissions(personnelId: number, permissions: string[]): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('company_personnel')
        .update({ permissions })
        .eq('id', personnelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update personnel permissions error:', error);
      return false;
    }
  }
  
  /**
   * Remove personnel from company
   */
  static async removePersonnel(personnelId: number): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('company_personnel')
        .update({ status: 'inactive' })
        .eq('id', personnelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Remove personnel error:', error);
      return false;
    }
  }
  
  /**
   * Get company invitations
   */
  static async getCompanyInvitations(companyId: number): Promise<PersonnelInvitation[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('personnel_invitations')
        .select(`
          id, company_id, email, position, department, permissions, invited_by,
          invited_at, expires_at, status, invitation_token,
          company:companies(id, company_name),
          inviter:users!invited_by(id, full_name, email)
        `)
        .eq('company_id', companyId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToInvitation);
    } catch (error) {
      console.error('Get company invitations error:', error);
      return [];
    }
  }
  
  /**
   * Cancel invitation
   */
  static async cancelInvitation(invitationId: number): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('personnel_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Cancel invitation error:', error);
      return false;
    }
  }
  
  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================
  
  private static async getPersonnelByEmail(companyId: number, email: string): Promise<CompanyPersonnel | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('company_personnel')
        .select(`
          id, company_id, user_id, status,
          user:users(email)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (error) return null;
      
      return data?.find((p: any) => p.user?.email?.toLowerCase() === email.toLowerCase()) 
        ? this.mapToPersonnel(data[0]) 
        : null;
    } catch (error) {
      return null;
    }
  }
  
  private static async getActiveInvitation(companyId: number, email: string): Promise<PersonnelInvitation | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('personnel_invitations')
        .select('*')
        .eq('company_id', companyId)
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending')
        .single();

      if (error) return null;
      return this.mapToInvitation(data);
    } catch (error) {
      return null;
    }
  }
  
  private static generateInvitationToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  private static async sendInvitationEmail(invitation: PersonnelInvitation): Promise<void> {
    // TODO: Implement email sending
    console.log('📧 Invitation email would be sent to:', invitation.email);
    console.log('🔗 Invitation link:', `${window.location.origin}/personnel-invitation/${invitation.invitationToken}`);
  }
  
  private static mapToPersonnel(data: any): CompanyPersonnel {
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      position: data.position,
      department: data.department,
      permissions: data.permissions || [],
      status: data.status,
      joinedAt: data.joined_at,
      invitedAt: data.invited_at,
      invitedBy: data.invited_by,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.full_name,
        phone: data.user.phone,
        status: data.user.status
      } : undefined,
      company: data.company ? {
        id: data.company.id,
        companyName: data.company.company_name,
        maxPersonnel: data.company.max_personnel
      } : undefined
    };
  }
  
  private static mapToInvitation(data: any): PersonnelInvitation {
    return {
      id: data.id,
      companyId: data.company_id,
      email: data.email,
      position: data.position,
      department: data.department,
      permissions: data.permissions || [],
      invitedBy: data.invited_by,
      invitedAt: data.invited_at,
      expiresAt: data.expires_at,
      status: data.status,
      invitationToken: data.invitation_token,
      company: data.company ? {
        id: data.company.id,
        companyName: data.company.company_name
      } : undefined,
      inviter: data.inviter ? {
        id: data.inviter.id,
        fullName: data.inviter.full_name,
        email: data.inviter.email
      } : undefined
    };
  }
}

// ================================================================
// PERMISSION HELPER FUNCTIONS
// ================================================================

export const PersonnelPermissionHelper = {
  /**
   * Get permission display names
   */
  getPermissionDisplayName: (permission: string): string => {
    const displayNames: Record<string, string> = {
      'project.view': 'Projeleri Görüntüle',
      'project.edit': 'Projeleri Düzenle',
      'project.create': 'Proje Oluştur',
      'education.view': 'Eğitimleri Görüntüle',
      'education.participate': 'Eğitimlere Katıl',
      'event.view': 'Etkinlikleri Görüntüle',
      'event.register': 'Etkinliklere Kayıt Ol',
      'forum.view': 'Forum Görüntüle',
      'forum.post': 'Forum Mesajı Gönder',
      'report.view': 'Raporları Görüntüle',
      'report.create': 'Rapor Oluştur'
    };
    return displayNames[permission] || permission;
  },

  /**
   * Group permissions by category
   */
  groupPermissionsByCategory: (permissions: string[]) => {
    const groups: Record<string, string[]> = {
      project: [],
      education: [],
      event: [],
      forum: [],
      report: []
    };

    permissions.forEach(permission => {
      const [category] = permission.split('.');
      if (groups[category]) {
        groups[category].push(permission);
      }
    });

    return groups;
  },

  /**
   * Check if user has specific permission
   */
  hasPermission: (userPermissions: string[], requiredPermission: string): boolean => {
    return userPermissions.includes(requiredPermission);
  },

  /**
   * Get available permission levels for position
   */
  getPermissionsForPosition: (position: string): string[] => {
    const positionPermissions: Record<string, string[]> = {
      'Manager': ALL_PERSONNEL_PERMISSIONS,
      'Assistant': DEFAULT_PERSONNEL_PERMISSIONS,
      'Intern': ['project.view', 'education.view', 'education.participate', 'forum.view']
    };
    return positionPermissions[position] || DEFAULT_PERSONNEL_PERMISSIONS;
  }
};

export default CompanyPersonnelService;
