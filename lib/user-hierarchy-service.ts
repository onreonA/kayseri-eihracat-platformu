/**
 * USER HIERARCHY SERVICE
 * Phase 2.1: Multi-user system with backward compatibility
 * 
 * This service provides a unified interface for the new multi-user system
 * while maintaining compatibility with existing code.
 */

import { getSupabaseClient } from './supabaseClient';

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  roleType: 'master_admin' | 'consultant' | 'company_owner' | 'company_personnel';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface Company {
  id: number;
  companyName: string;
  sector?: string;
  address?: string;
  taxNumber?: string;
  ownerUserId: number;
  assignedConsultantId?: number;
  status: 'active' | 'inactive' | 'pending_approval';
  maxPersonnel: number;
  profileCompletionStatus: 'incomplete' | 'complete' | 'pending_review';
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, any>;
  
  // Related data (when populated)
  owner?: User;
  consultant?: User;
  personnel?: CompanyPersonnel[];
}

export interface CompanyPersonnel {
  id: number;
  companyId: number;
  userId: number;
  position?: string;
  department?: string;
  permissions: string[];
  status: 'active' | 'inactive';
  joinedAt: string;
  
  // Related data
  user?: User;
  company?: Company;
}

export interface Consultant {
  id: number;
  userId: number;
  department?: string;
  specialization?: string;
  adminPermissions: string[];
  maxAssignedCompanies: number;
  currentCompanyCount: number;
  status: 'active' | 'inactive' | 'on_leave';
  hiredAt: string;
  
  // Related data
  user?: User;
  assignedCompanies?: Company[];
}

// Legacy interface for backward compatibility
export interface LegacyFirma {
  id: number;
  firmaAdi: string;
  yetkiliAdi: string;
  yetkiliEmail: string;
  telefon: string;
  durum: 'Aktif' | 'Pasif';
  firmaProfilDurumu: 'Eksik' | 'Tamamlandı' | 'Onay Bekliyor';
  createdAt: string;
  adres?: string;
  sektor?: string;
  sifre?: string;
}

// ================================================================
// USER SERVICE
// ================================================================

export class UserService {
  static async createUser(userData: Partial<User>): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          full_name: userData.fullName,
          phone: userData.phone,
          role_type: userData.roleType,
          status: userData.status || 'active',
          metadata: userData.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapToUser(data);
    } catch (error) {
      console.error('Create user error:', error);
      return null;
    }
  }

  static async getUserById(id: number): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return this.mapToUser(data);
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error) throw error;
      return this.mapToUser(data);
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  static async updateUser(id: number, updateData: Partial<User>): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const updatePayload: any = {};
      if (updateData.email) updatePayload.email = updateData.email;
      if (updateData.fullName) updatePayload.full_name = updateData.fullName;
      if (updateData.phone) updatePayload.phone = updateData.phone;
      if (updateData.status) updatePayload.status = updateData.status;
      if (updateData.metadata) updatePayload.metadata = updateData.metadata;

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.mapToUser(data);
    } catch (error) {
      console.error('Update user error:', error);
      return null;
    }
  }

  private static mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      roleType: data.role_type,
      status: data.status,
      lastLogin: data.last_login,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      metadata: data.metadata || {}
    };
  }
}

// ================================================================
// COMPANY SERVICE
// ================================================================

export class CompanyService {
  static async getAllCompanies(): Promise<Company[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          owner:owner_user_id(id, email, full_name, phone, role_type, status),
          consultant:assigned_consultant_id(id, email, full_name)
        `)
        .order('id', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapToCompany);
    } catch (error) {
      console.error('Get all companies error:', error);
      return [];
    }
  }

  static async getCompanyById(id: number): Promise<Company | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          owner:owner_user_id(id, email, full_name, phone, role_type, status),
          consultant:assigned_consultant_id(id, email, full_name),
          personnel:company_personnel(
            id, position, department, permissions, status, joined_at,
            user:user_id(id, email, full_name, phone)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return this.mapToCompany(data);
    } catch (error) {
      console.error('Get company error:', error);
      return null;
    }
  }

  static async createCompany(companyData: Partial<Company>): Promise<Company | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('companies')
        .insert({
          company_name: companyData.companyName,
          sector: companyData.sector,
          address: companyData.address,
          tax_number: companyData.taxNumber,
          owner_user_id: companyData.ownerUserId,
          assigned_consultant_id: companyData.assignedConsultantId,
          status: companyData.status || 'active',
          max_personnel: companyData.maxPersonnel || 3,
          profile_completion_status: companyData.profileCompletionStatus || 'incomplete',
          settings: companyData.settings || {}
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapToCompany(data);
    } catch (error) {
      console.error('Create company error:', error);
      return null;
    }
  }

  static async addPersonnel(companyId: number, userId: number, personnelData: Partial<CompanyPersonnel>): Promise<CompanyPersonnel | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Check personnel limit first
      const { data: currentPersonnel, error: checkError } = await supabase
        .from('company_personnel')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (checkError) throw checkError;

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('max_personnel')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      if (currentPersonnel.length >= company.max_personnel) {
        throw new Error(`Company has reached maximum personnel limit (${company.max_personnel})`);
      }

      const { data, error } = await supabase
        .from('company_personnel')
        .insert({
          company_id: companyId,
          user_id: userId,
          position: personnelData.position,
          department: personnelData.department,
          permissions: personnelData.permissions || [],
          status: personnelData.status || 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapToPersonnel(data);
    } catch (error) {
      console.error('Add personnel error:', error);
      return null;
    }
  }

  private static mapToCompany(data: any): Company {
    return {
      id: data.id,
      companyName: data.company_name,
      sector: data.sector,
      address: data.address,
      taxNumber: data.tax_number,
      ownerUserId: data.owner_user_id,
      assignedConsultantId: data.assigned_consultant_id,
      status: data.status,
      maxPersonnel: data.max_personnel,
      profileCompletionStatus: data.profile_completion_status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      settings: data.settings || {},
      owner: data.owner ? UserService['mapToUser'](data.owner) : undefined,
      consultant: data.consultant ? UserService['mapToUser'](data.consultant) : undefined,
      personnel: data.personnel ? data.personnel.map(this.mapToPersonnel) : undefined
    };
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
      user: data.user ? UserService['mapToUser'](data.user) : undefined
    };
  }
}

// ================================================================
// BACKWARD COMPATIBILITY SERVICE
// ================================================================

export class LegacyCompatibilityService {
  /**
   * Provides backward compatibility for existing code that expects 'firmalar' format
   */
  static async getAllFirmalar(): Promise<LegacyFirma[]> {
    try {
      const companies = await CompanyService.getAllCompanies();
      return companies.map(this.mapCompanyToLegacyFirma);
    } catch (error) {
      console.error('Legacy firmalar compatibility error:', error);
      return [];
    }
  }

  static async getFirmaById(id: number): Promise<LegacyFirma | null> {
    try {
      const company = await CompanyService.getCompanyById(id);
      return company ? this.mapCompanyToLegacyFirma(company) : null;
    } catch (error) {
      console.error('Legacy firma by ID compatibility error:', error);
      return null;
    }
  }

  private static mapCompanyToLegacyFirma(company: Company): LegacyFirma {
    return {
      id: company.id,
      firmaAdi: company.companyName,
      yetkiliAdi: company.owner?.fullName || 'Bilinmeyen',
      yetkiliEmail: company.owner?.email || '',
      telefon: company.owner?.phone || '',
      durum: company.status === 'active' ? 'Aktif' : 'Pasif',
      firmaProfilDurumu: 
        company.profileCompletionStatus === 'complete' ? 'Tamamlandı' :
        company.profileCompletionStatus === 'pending_review' ? 'Onay Bekliyor' : 'Eksik',
      createdAt: company.createdAt,
      adres: company.address,
      sektor: company.sector,
      sifre: '123456' // Default for compatibility
    };
  }
}

// ================================================================
// CONSULTANT SERVICE
// ================================================================

export class ConsultantService {
  static async getAllConsultants(): Promise<Consultant[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultants')
        .select(`
          *,
          user:user_id(id, email, full_name, phone, role_type, status)
        `)
        .order('id', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapToConsultant);
    } catch (error) {
      console.error('Get all consultants error:', error);
      return [];
    }
  }

  static async getConsultantByUserId(userId: number): Promise<Consultant | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultants')
        .select(`
          *,
          user:user_id(id, email, full_name, phone, role_type, status),
          assignedCompanies:companies!assigned_consultant_id(id, company_name, status)
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return this.mapToConsultant(data);
    } catch (error) {
      console.error('Get consultant by user ID error:', error);
      return null;
    }
  }

  private static mapToConsultant(data: any): Consultant {
    return {
      id: data.id,
      userId: data.user_id,
      department: data.department,
      specialization: data.specialization,
      adminPermissions: data.admin_permissions || [],
      maxAssignedCompanies: data.max_assigned_companies,
      currentCompanyCount: data.current_company_count,
      status: data.status,
      hiredAt: data.hired_at,
      user: data.user ? UserService['mapToUser'](data.user) : undefined,
      assignedCompanies: data.assignedCompanies || []
    };
  }
}

// ================================================================
// AUTHENTICATION SERVICE
// ================================================================

export class AuthService {
  static async authenticateUser(email: string, password: string): Promise<{
    success: boolean;
    user?: User;
    company?: Company;
    consultant?: Consultant;
    error?: string;
  }> {
    try {
      // Get user by email
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }

      // Check if user is active
      if (user.status !== 'active') {
        return { success: false, error: 'Hesap aktif değil' };
      }

      // Validate password (simplified - in production use proper password hashing)
      const validPasswords = ['123456', '111111', '112233', 'admin123'];
      if (!validPasswords.includes(password)) {
        return { success: false, error: 'Geçersiz şifre' };
      }

      // Get additional data based on role
      let company: Company | undefined;
      let consultant: Consultant | undefined;

      if (user.roleType === 'company_owner') {
        const companies = await CompanyService.getAllCompanies();
        company = companies.find(c => c.ownerUserId === user.id);
      } else if (user.roleType === 'consultant') {
        consultant = await ConsultantService.getConsultantByUserId(user.id);
      }

      return {
        success: true,
        user,
        company,
        consultant
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Giriş hatası' };
    }
  }

  static async getUserRole(userId: number): Promise<string[]> {
    try {
      const user = await UserService.getUserById(userId);
      if (!user) return [];

      // Get base permissions based on role type
      switch (user.roleType) {
        case 'master_admin':
          return ['admin.*']; // Full admin access
        case 'consultant':
          const consultant = await ConsultantService.getConsultantByUserId(userId);
          return consultant?.adminPermissions || [];
        case 'company_owner':
          return ['company.view', 'company.edit', 'company.manage_personnel', 'project.view', 'education.view'];
        case 'company_personnel':
          // Get specific permissions from company_personnel table
          const supabase = getSupabaseClient();
          if (!supabase) return [];
          
          const { data, error } = await supabase
            .from('company_personnel')
            .select('permissions')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();
          
          return error ? [] : (data.permissions || []);
        default:
          return [];
      }
    } catch (error) {
      console.error('Get user role error:', error);
      return [];
    }
  }
}

// ================================================================
// EXPORT EVERYTHING
// ================================================================

export {
  UserService,
  CompanyService,
  ConsultantService,
  AuthService,
  LegacyCompatibilityService
};

// Default export for backward compatibility
export default {
  UserService,
  CompanyService,
  ConsultantService,
  AuthService,
  LegacyCompatibilityService
};
