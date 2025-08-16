/**
 * CONSULTANT MANAGEMENT SERVICE
 * Phase 2.4: Admin consultant management system
 * 
 * Features:
 * - Master Admin can create and manage consultants
 * - Hierarchical system: Admin → Consultants → Companies → Personnel
 * - Specialized consultant types (education, project, general)
 * - Project/company assignment system
 * - Consultant dashboard access controls
 */

import { getSupabaseClient } from './supabaseClient';
import { UserService } from './user-hierarchy-service';

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface Consultant {
  id: number;
  userId: number;
  specialization: ConsultantSpecialization[];
  department?: string;
  title?: string;
  status: 'active' | 'inactive' | 'suspended';
  hireDate: string;
  maxCompanies?: number; // Maximum companies they can manage
  maxProjects?: number; // Maximum projects they can handle
  createdBy: number; // Master admin who created them
  createdAt: string;
  
  // Related data
  user?: {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
    status: string;
  };
  creator?: {
    id: number;
    fullName: string;
    email: string;
  };
  
  // Statistics
  assignedCompaniesCount?: number;
  assignedProjectsCount?: number;
  completedProjectsCount?: number;
}

export interface ConsultantAssignment {
  id: number;
  consultantId: number;
  assignmentType: 'company' | 'project' | 'education_program' | 'event';
  entityId: number; // ID of the assigned company/project/program/event
  assignedBy: number;
  assignedAt: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate?: string;
  endDate?: string;
  notes?: string;
  
  // Related data
  consultant?: {
    id: number;
    fullName: string;
    specialization: ConsultantSpecialization[];
  };
  assignedByUser?: {
    id: number;
    fullName: string;
  };
  entity?: {
    id: number;
    name: string;
    type: string;
  };
}

export type ConsultantSpecialization = 
  | 'project_management'
  | 'education_coordination'
  | 'event_management'
  | 'company_relations'
  | 'technical_support'
  | 'business_development'
  | 'export_consulting'
  | 'digital_marketing';

export interface ConsultantPerformance {
  consultantId: number;
  period: string; // 'monthly' | 'quarterly' | 'yearly'
  companiesManaged: number;
  projectsCompleted: number;
  clientSatisfactionScore?: number;
  responseTime?: number; // Average response time in hours
  tasksCompleted: number;
  tasksOverdue: number;
  trainingSessionsGiven?: number;
  eventsOrganized?: number;
}

export const CONSULTANT_SPECIALIZATIONS = [
  { value: 'project_management', label: 'Proje Yönetimi', icon: 'ri-project-line' },
  { value: 'education_coordination', label: 'Eğitim Koordinasyonu', icon: 'ri-graduation-cap-line' },
  { value: 'event_management', label: 'Etkinlik Yönetimi', icon: 'ri-calendar-event-line' },
  { value: 'company_relations', label: 'Firma İlişkileri', icon: 'ri-building-line' },
  { value: 'technical_support', label: 'Teknik Destek', icon: 'ri-tools-line' },
  { value: 'business_development', label: 'İş Geliştirme', icon: 'ri-line-chart-line' },
  { value: 'export_consulting', label: 'İhracat Danışmanlığı', icon: 'ri-global-line' },
  { value: 'digital_marketing', label: 'Dijital Pazarlama', icon: 'ri-advertise-line' }
] as const;

export const DEFAULT_CONSULTANT_PERMISSIONS = [
  'companies.view',
  'companies.manage_assigned',
  'projects.view',
  'projects.manage_assigned',
  'education.view',
  'education.manage_assigned',
  'events.view',
  'events.manage_assigned',
  'reports.create',
  'reports.view_own'
];

// ================================================================
// CONSULTANT MANAGEMENT SERVICE
// ================================================================

export class ConsultantManagementService {
  
  /**
   * Get all consultants
   */
  static async getAllConsultants(): Promise<Consultant[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultants')
        .select(`
          id, user_id, specialization, department, title, status, hire_date,
          max_companies, max_projects, created_by, created_at,
          user:users(id, email, full_name, phone, status),
          creator:users!created_by(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get assignment statistics for each consultant
      const consultantsWithStats = await Promise.all(
        (data || []).map(async (consultant) => {
          const stats = await this.getConsultantStatistics(consultant.id);
          return this.mapToConsultant(consultant, stats);
        })
      );

      return consultantsWithStats;
    } catch (error) {
      console.error('Get all consultants error:', error);
      return [];
    }
  }
  
  /**
   * Get consultant by ID
   */
  static async getConsultantById(consultantId: number): Promise<Consultant | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultants')
        .select(`
          id, user_id, specialization, department, title, status, hire_date,
          max_companies, max_projects, created_by, created_at,
          user:users(id, email, full_name, phone, status),
          creator:users!created_by(id, full_name, email)
        `)
        .eq('id', consultantId)
        .single();

      if (error) throw error;

      const stats = await this.getConsultantStatistics(consultantId);
      return this.mapToConsultant(data, stats);
    } catch (error) {
      console.error('Get consultant by ID error:', error);
      return null;
    }
  }
  
  /**
   * Get consultant by user ID
   */
  static async getConsultantByUserId(userId: number): Promise<Consultant | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultants')
        .select(`
          id, user_id, specialization, department, title, status, hire_date,
          max_companies, max_projects, created_by, created_at,
          user:users(id, email, full_name, phone, status),
          creator:users!created_by(id, full_name, email)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      const stats = await this.getConsultantStatistics(data.id);
      return this.mapToConsultant(data, stats);
    } catch (error) {
      console.error('Get consultant by user ID error:', error);
      return null;
    }
  }
  
  /**
   * Create new consultant
   */
  static async createConsultant(consultantData: {
    email: string;
    fullName: string;
    phone?: string;
    specialization: ConsultantSpecialization[];
    department?: string;
    title?: string;
    maxCompanies?: number;
    maxProjects?: number;
    createdBy: number;
  }): Promise<Consultant | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // First create user account
      const user = await UserService.createUser({
        email: consultantData.email,
        fullName: consultantData.fullName,
        phone: consultantData.phone,
        roleType: 'consultant',
        status: 'active'
      });

      if (!user) {
        throw new Error('Failed to create user account for consultant');
      }

      // Create consultant record
      const { data, error } = await supabase
        .from('consultants')
        .insert({
          user_id: user.id,
          specialization: consultantData.specialization,
          department: consultantData.department,
          title: consultantData.title,
          status: 'active',
          max_companies: consultantData.maxCompanies || 10,
          max_projects: consultantData.maxProjects || 20,
          created_by: consultantData.createdBy
        })
        .select(`
          id, user_id, specialization, department, title, status, hire_date,
          max_companies, max_projects, created_by, created_at,
          user:users(id, email, full_name, phone, status),
          creator:users!created_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapToConsultant(data);
    } catch (error) {
      console.error('Create consultant error:', error);
      return null;
    }
  }
  
  /**
   * Update consultant
   */
  static async updateConsultant(consultantId: number, updates: {
    specialization?: ConsultantSpecialization[];
    department?: string;
    title?: string;
    status?: 'active' | 'inactive' | 'suspended';
    maxCompanies?: number;
    maxProjects?: number;
  }): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('consultants')
        .update({
          specialization: updates.specialization,
          department: updates.department,
          title: updates.title,
          status: updates.status,
          max_companies: updates.maxCompanies,
          max_projects: updates.maxProjects
        })
        .eq('id', consultantId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update consultant error:', error);
      return false;
    }
  }
  
  /**
   * Assign consultant to entity (company/project/program)
   */
  static async assignConsultant(assignment: {
    consultantId: number;
    assignmentType: 'company' | 'project' | 'education_program' | 'event';
    entityId: number;
    assignedBy: number;
    startDate?: string;
    endDate?: string;
    notes?: string;
  }): Promise<ConsultantAssignment | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Check if consultant can handle more assignments
      const canAssign = await this.canConsultantTakeAssignment(
        assignment.consultantId, 
        assignment.assignmentType
      );
      
      if (!canAssign.allowed) {
        throw new Error(canAssign.reason);
      }

      // Create assignment
      const { data, error } = await supabase
        .from('consultant_assignments')
        .insert({
          consultant_id: assignment.consultantId,
          assignment_type: assignment.assignmentType,
          entity_id: assignment.entityId,
          assigned_by: assignment.assignedBy,
          start_date: assignment.startDate,
          end_date: assignment.endDate,
          notes: assignment.notes,
          status: 'active'
        })
        .select(`
          id, consultant_id, assignment_type, entity_id, assigned_by, assigned_at,
          status, start_date, end_date, notes,
          consultant:consultants(id, user:users(full_name), specialization),
          assigned_by_user:users!assigned_by(id, full_name)
        `)
        .single();

      if (error) throw error;
      return this.mapToAssignment(data);
    } catch (error) {
      console.error('Assign consultant error:', error);
      return null;
    }
  }
  
  /**
   * Get consultant assignments
   */
  static async getConsultantAssignments(consultantId: number): Promise<ConsultantAssignment[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultant_assignments')
        .select(`
          id, consultant_id, assignment_type, entity_id, assigned_by, assigned_at,
          status, start_date, end_date, notes,
          consultant:consultants(id, user:users(full_name), specialization),
          assigned_by_user:users!assigned_by(id, full_name)
        `)
        .eq('consultant_id', consultantId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToAssignment);
    } catch (error) {
      console.error('Get consultant assignments error:', error);
      return [];
    }
  }
  
  /**
   * Get assignments by entity
   */
  static async getAssignmentsByEntity(
    assignmentType: 'company' | 'project' | 'education_program' | 'event',
    entityId: number
  ): Promise<ConsultantAssignment[]> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('consultant_assignments')
        .select(`
          id, consultant_id, assignment_type, entity_id, assigned_by, assigned_at,
          status, start_date, end_date, notes,
          consultant:consultants(id, user:users(full_name), specialization),
          assigned_by_user:users!assigned_by(id, full_name)
        `)
        .eq('assignment_type', assignmentType)
        .eq('entity_id', entityId)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToAssignment);
    } catch (error) {
      console.error('Get assignments by entity error:', error);
      return [];
    }
  }
  
  /**
   * Complete assignment
   */
  static async completeAssignment(assignmentId: number, notes?: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('consultant_assignments')
        .update({ 
          status: 'completed',
          end_date: new Date().toISOString(),
          notes: notes 
        })
        .eq('id', assignmentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Complete assignment error:', error);
      return false;
    }
  }
  
  /**
   * Get consultant performance metrics
   */
  static async getConsultantPerformance(
    consultantId: number, 
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<ConsultantPerformance | null> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Get assignments in period
      const { data: assignments } = await supabase
        .from('consultant_assignments')
        .select('*')
        .eq('consultant_id', consultantId)
        .gte('assigned_at', startDate.toISOString());

      if (!assignments) return null;

      // Calculate metrics
      const companiesManaged = new Set(
        assignments
          .filter(a => a.assignment_type === 'company' && a.status === 'active')
          .map(a => a.entity_id)
      ).size;

      const projectsCompleted = assignments.filter(
        a => a.assignment_type === 'project' && a.status === 'completed'
      ).length;

      const trainingSessionsGiven = assignments.filter(
        a => a.assignment_type === 'education_program' && a.status === 'completed'
      ).length;

      const eventsOrganized = assignments.filter(
        a => a.assignment_type === 'event' && a.status === 'completed'
      ).length;

      return {
        consultantId,
        period,
        companiesManaged,
        projectsCompleted,
        tasksCompleted: projectsCompleted + trainingSessionsGiven + eventsOrganized,
        tasksOverdue: 0, // TODO: Calculate based on due dates
        trainingSessionsGiven,
        eventsOrganized
      };
    } catch (error) {
      console.error('Get consultant performance error:', error);
      return null;
    }
  }
  
  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================
  
  private static async getConsultantStatistics(consultantId: number) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return { assignedCompaniesCount: 0, assignedProjectsCount: 0, completedProjectsCount: 0 };

      const { data: assignments } = await supabase
        .from('consultant_assignments')
        .select('assignment_type, status')
        .eq('consultant_id', consultantId);

      if (!assignments) return { assignedCompaniesCount: 0, assignedProjectsCount: 0, completedProjectsCount: 0 };

      const assignedCompaniesCount = assignments.filter(
        a => a.assignment_type === 'company' && a.status === 'active'
      ).length;

      const assignedProjectsCount = assignments.filter(
        a => a.assignment_type === 'project' && a.status === 'active'
      ).length;

      const completedProjectsCount = assignments.filter(
        a => a.assignment_type === 'project' && a.status === 'completed'
      ).length;

      return { assignedCompaniesCount, assignedProjectsCount, completedProjectsCount };
    } catch (error) {
      return { assignedCompaniesCount: 0, assignedProjectsCount: 0, completedProjectsCount: 0 };
    }
  }
  
  private static async canConsultantTakeAssignment(
    consultantId: number, 
    assignmentType: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const consultant = await this.getConsultantById(consultantId);
      if (!consultant) {
        return { allowed: false, reason: 'Consultant not found' };
      }

      if (consultant.status !== 'active') {
        return { allowed: false, reason: 'Consultant is not active' };
      }

      const stats = await this.getConsultantStatistics(consultantId);

      // Check company limits
      if (assignmentType === 'company' && consultant.maxCompanies) {
        if (stats.assignedCompaniesCount >= consultant.maxCompanies) {
          return { 
            allowed: false, 
            reason: `Maximum company limit (${consultant.maxCompanies}) reached` 
          };
        }
      }

      // Check project limits
      if (assignmentType === 'project' && consultant.maxProjects) {
        if (stats.assignedProjectsCount >= consultant.maxProjects) {
          return { 
            allowed: false, 
            reason: `Maximum project limit (${consultant.maxProjects}) reached` 
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: 'Error checking assignment limits' };
    }
  }
  
  private static mapToConsultant(data: any, stats?: any): Consultant {
    return {
      id: data.id,
      userId: data.user_id,
      specialization: data.specialization || [],
      department: data.department,
      title: data.title,
      status: data.status,
      hireDate: data.hire_date,
      maxCompanies: data.max_companies,
      maxProjects: data.max_projects,
      createdBy: data.created_by,
      createdAt: data.created_at,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.full_name,
        phone: data.user.phone,
        status: data.user.status
      } : undefined,
      creator: data.creator ? {
        id: data.creator.id,
        fullName: data.creator.full_name,
        email: data.creator.email
      } : undefined,
      assignedCompaniesCount: stats?.assignedCompaniesCount || 0,
      assignedProjectsCount: stats?.assignedProjectsCount || 0,
      completedProjectsCount: stats?.completedProjectsCount || 0
    };
  }
  
  private static mapToAssignment(data: any): ConsultantAssignment {
    return {
      id: data.id,
      consultantId: data.consultant_id,
      assignmentType: data.assignment_type,
      entityId: data.entity_id,
      assignedBy: data.assigned_by,
      assignedAt: data.assigned_at,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      notes: data.notes,
      consultant: data.consultant ? {
        id: data.consultant.id,
        fullName: data.consultant.user?.full_name,
        specialization: data.consultant.specialization || []
      } : undefined,
      assignedByUser: data.assigned_by_user ? {
        id: data.assigned_by_user.id,
        fullName: data.assigned_by_user.full_name
      } : undefined
    };
  }
}

// ================================================================
// CONSULTANT HELPER FUNCTIONS
// ================================================================

export const ConsultantHelper = {
  /**
   * Get specialization display name
   */
  getSpecializationDisplayName: (specialization: ConsultantSpecialization): string => {
    const spec = CONSULTANT_SPECIALIZATIONS.find(s => s.value === specialization);
    return spec?.label || specialization;
  },

  /**
   * Get specialization icon
   */
  getSpecializationIcon: (specialization: ConsultantSpecialization): string => {
    const spec = CONSULTANT_SPECIALIZATIONS.find(s => s.value === specialization);
    return spec?.icon || 'ri-user-line';
  },

  /**
   * Get consultant status badge color
   */
  getStatusBadgeColor: (status: string): string => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get assignment status badge color
   */
  getAssignmentStatusColor: (status: string): string => {
    const colors = {
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Calculate workload percentage
   */
  calculateWorkload: (consultant: Consultant): number => {
    const totalCapacity = (consultant.maxCompanies || 10) + (consultant.maxProjects || 20);
    const currentLoad = (consultant.assignedCompaniesCount || 0) + (consultant.assignedProjectsCount || 0);
    return Math.round((currentLoad / totalCapacity) * 100);
  },

  /**
   * Get consultant availability status
   */
  getAvailabilityStatus: (consultant: Consultant): { status: string; color: string; message: string } => {
    const workload = ConsultantHelper.calculateWorkload(consultant);
    
    if (workload < 50) {
      return { 
        status: 'available', 
        color: 'text-green-600', 
        message: 'Müsait' 
      };
    } else if (workload < 80) {
      return { 
        status: 'busy', 
        color: 'text-yellow-600', 
        message: 'Meşgul' 
      };
    } else {
      return { 
        status: 'overloaded', 
        color: 'text-red-600', 
        message: 'Aşırı Yüklü' 
      };
    }
  }
};

export default ConsultantManagementService;
