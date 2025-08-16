-- ================================================================
-- İHRACAT AKADEMİSİ - IDEAL DATABASE SCHEMA DESIGN
-- PHASE 2.1: Multi-User Hierarchy System
-- ================================================================

-- ================================================================
-- 1. MASTER USERS TABLE (Centralized user management)
-- ================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For Supabase auth, can be NULL if using Supabase auth
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('master_admin', 'consultant', 'company_owner', 'company_personnel')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id), -- Who created this user
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

-- ================================================================
-- 2. COMPANIES TABLE (Evolved from firmalar)
-- ================================================================
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    sector VARCHAR(50),
    address TEXT,
    tax_number VARCHAR(20),
    
    -- Owner information
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Consultant assignment
    assigned_consultant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Status and settings
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval')),
    max_personnel INTEGER DEFAULT 3, -- Maximum allowed personnel
    
    -- Profile completion
    profile_completion_status VARCHAR(20) DEFAULT 'incomplete' CHECK (profile_completion_status IN ('incomplete', 'complete', 'pending_review')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    notes TEXT
);

-- ================================================================
-- 3. COMPANY PERSONNEL (Sub-users for companies)
-- ================================================================
CREATE TABLE company_personnel (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role within company
    position VARCHAR(50), -- E.g., "Export Manager", "Assistant", etc.
    department VARCHAR(50),
    
    -- Permissions within company
    permissions JSONB DEFAULT '[]', -- Array of permission strings
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, user_id) -- Each user can only be personnel once per company
);

-- ================================================================
-- 4. CONSULTANTS (Admin sub-users)
-- ================================================================
CREATE TABLE consultants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Consultant details
    department VARCHAR(50),
    specialization VARCHAR(100), -- E.g., "Export Compliance", "Digital Marketing"
    
    -- Admin permissions
    admin_permissions JSONB DEFAULT '[]', -- Array of admin permission strings
    
    -- Workload
    max_assigned_companies INTEGER DEFAULT 10,
    current_company_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    
    -- Timestamps
    hired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- 5. ROLE DEFINITIONS (Flexible permission system)
-- ================================================================
CREATE TABLE role_definitions (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_type VARCHAR(20) NOT NULL, -- 'system', 'company', 'custom'
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission strings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- 6. USER SESSIONS (Enhanced session management)
-- ================================================================
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB, -- Browser, OS, etc.
    ip_address INET,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- 7. ACTIVITY LOGS (Audit trail)
-- ================================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50), -- 'company', 'project', 'user', etc.
    resource_id INTEGER,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- 8. PERMISSIONS (Granular permission system)
-- ================================================================
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    permission_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'company.create', 'project.edit'
    permission_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'company', 'project', 'admin', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_type ON users(role_type);
CREATE INDEX idx_users_status ON users(status);

-- Companies table indexes
CREATE INDEX idx_companies_owner_user_id ON companies(owner_user_id);
CREATE INDEX idx_companies_consultant_id ON companies(assigned_consultant_id);
CREATE INDEX idx_companies_status ON companies(status);

-- Company personnel indexes
CREATE INDEX idx_company_personnel_company_id ON company_personnel(company_id);
CREATE INDEX idx_company_personnel_user_id ON company_personnel(user_id);

-- Consultants indexes
CREATE INDEX idx_consultants_user_id ON consultants(user_id);

-- Sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ================================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_personnel_updated_at BEFORE UPDATE ON company_personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultants_updated_at BEFORE UPDATE ON consultants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ================================================================

-- Function to check company personnel limit
CREATE OR REPLACE FUNCTION check_company_personnel_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM company_personnel WHERE company_id = NEW.company_id AND status = 'active') >= 
       (SELECT max_personnel FROM companies WHERE id = NEW.company_id) THEN
        RAISE EXCEPTION 'Company has reached maximum personnel limit';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply personnel limit trigger
CREATE TRIGGER check_personnel_limit 
    BEFORE INSERT ON company_personnel 
    FOR EACH ROW EXECUTE FUNCTION check_company_personnel_limit();

-- Function to update consultant company count
CREATE OR REPLACE FUNCTION update_consultant_company_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_company_count in consultants table
    UPDATE consultants 
    SET current_company_count = (
        SELECT COUNT(*) 
        FROM companies 
        WHERE assigned_consultant_id = consultants.user_id 
        AND status = 'active'
    )
    WHERE user_id = COALESCE(NEW.assigned_consultant_id, OLD.assigned_consultant_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply consultant count trigger
CREATE TRIGGER update_consultant_count 
    AFTER INSERT OR UPDATE OR DELETE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_consultant_company_count();

-- ================================================================
-- INITIAL DATA - DEFAULT PERMISSIONS
-- ================================================================

-- Insert default permissions
INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
-- Company management
('company.view', 'View Company', 'View company information', 'company'),
('company.edit', 'Edit Company', 'Edit company details', 'company'),
('company.manage_personnel', 'Manage Personnel', 'Add/remove company personnel', 'company'),

-- Project management  
('project.view', 'View Projects', 'View project information', 'project'),
('project.create', 'Create Projects', 'Create new projects', 'project'),
('project.edit', 'Edit Projects', 'Edit project details', 'project'),
('project.delete', 'Delete Projects', 'Delete projects', 'project'),

-- Education
('education.view', 'View Education', 'View education content', 'education'),
('education.participate', 'Participate in Education', 'Participate in education programs', 'education'),

-- Events
('event.view', 'View Events', 'View events', 'event'),
('event.register', 'Register for Events', 'Register for events', 'event'),

-- Forum
('forum.view', 'View Forum', 'View forum topics', 'forum'),
('forum.post', 'Post in Forum', 'Create forum posts', 'forum'),
('forum.moderate', 'Moderate Forum', 'Moderate forum content', 'forum'),

-- Admin permissions
('admin.user_management', 'User Management', 'Manage users', 'admin'),
('admin.company_management', 'Company Management', 'Manage companies', 'admin'),
('admin.system_settings', 'System Settings', 'Configure system settings', 'admin'),
('admin.reports', 'View Reports', 'Access system reports', 'admin');

-- Insert default role definitions
INSERT INTO role_definitions (role_name, role_type, description, permissions) VALUES
('Master Admin', 'system', 'Full system access', '["admin.user_management", "admin.company_management", "admin.system_settings", "admin.reports"]'),
('Consultant', 'system', 'Manage assigned companies', '["company.view", "company.edit", "project.view", "project.create", "project.edit", "admin.reports"]'),
('Company Owner', 'company', 'Company owner with full company access', '["company.view", "company.edit", "company.manage_personnel", "project.view", "education.view", "education.participate", "event.view", "event.register", "forum.view", "forum.post"]'),
('Company Personnel', 'company', 'Limited company access', '["project.view", "education.view", "education.participate", "event.view", "event.register", "forum.view", "forum.post"]');

-- ================================================================
-- NOTES:
-- ================================================================
-- 1. This schema maintains backward compatibility with existing 'firmalar' table
-- 2. Supports multi-level user hierarchy: Master Admin > Consultant > Company Owner > Personnel
-- 3. Flexible permission system allows granular access control
-- 4. Built-in constraints for business rules (max 3 personnel per company)
-- 5. Comprehensive audit trail via activity_logs
-- 6. Session management for security
-- 7. Optimized with appropriate indexes
-- ================================================================
