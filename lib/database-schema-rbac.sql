-- ================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) TABLES
-- Phase 2.5: Role-based permissions & access control
-- ================================================================

-- Roles Table
-- Defines hierarchical roles with inheritance support
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 5, -- Hierarchy level (1=highest authority, 10=lowest)
    parent_role_id BIGINT REFERENCES roles(id) ON DELETE SET NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT false, -- Cannot be deleted if true
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_level_range CHECK (level >= 1 AND level <= 10),
    CONSTRAINT check_no_self_parent CHECK (id != parent_role_id),
    
    -- Indexes
    INDEX idx_roles_slug (slug),
    INDEX idx_roles_level (level),
    INDEX idx_roles_parent (parent_role_id),
    INDEX idx_roles_status (status),
    INDEX idx_roles_system (is_system_role)
);

-- Permissions Table
-- Defines granular permissions for resources and actions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE, -- Format: resource.action (e.g., 'companies.view', 'projects.edit')
    resource VARCHAR(50) NOT NULL, -- e.g., 'companies', 'projects', 'users'
    action VARCHAR(50) NOT NULL, -- e.g., 'view', 'edit', 'create', 'delete'
    description TEXT,
    is_system_permission BOOLEAN NOT NULL DEFAULT false, -- Cannot be deleted if true
    category VARCHAR(30) NOT NULL DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_resource_action UNIQUE (resource, action),
    
    -- Indexes
    INDEX idx_permissions_slug (slug),
    INDEX idx_permissions_resource (resource),
    INDEX idx_permissions_action (action),
    INDEX idx_permissions_category (category),
    INDEX idx_permissions_system (is_system_permission)
);

-- Role Permissions Table
-- Links roles to permissions with grant/deny capability
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT true, -- true = grant, false = explicit deny
    conditions JSONB, -- Optional conditions for the permission
    granted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id),
    
    -- Indexes
    INDEX idx_role_permissions_role (role_id),
    INDEX idx_role_permissions_permission (permission_id),
    INDEX idx_role_permissions_granted (granted),
    INDEX idx_role_permissions_conditions USING GIN (conditions)
);

-- User Roles Table
-- Links users to roles with temporal support
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    notes TEXT,
    
    -- Constraints
    CONSTRAINT unique_active_user_role UNIQUE (user_id, role_id, status),
    
    -- Indexes
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id),
    INDEX idx_user_roles_assigned_by (assigned_by),
    INDEX idx_user_roles_status (status),
    INDEX idx_user_roles_expires (expires_at)
);

-- User Permissions Table
-- Direct user-specific permissions (overrides role permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT true, -- true = grant, false = explicit deny
    resource_id BIGINT, -- Optional: specific resource instance (e.g., company_id, project_id)
    conditions JSONB, -- Optional conditions for the permission
    granted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    notes TEXT,
    
    -- Constraints
    CONSTRAINT unique_user_permission_resource UNIQUE (user_id, permission_id, resource_id),
    
    -- Indexes
    INDEX idx_user_permissions_user (user_id),
    INDEX idx_user_permissions_permission (permission_id),
    INDEX idx_user_permissions_resource (resource_id),
    INDEX idx_user_permissions_granted (granted),
    INDEX idx_user_permissions_expires (expires_at),
    INDEX idx_user_permissions_conditions USING GIN (conditions)
);

-- Permission Audit Log Table
-- Tracks all permission changes for compliance
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id BIGSERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- 'role_assigned', 'permission_granted', 'permission_revoked', etc.
    target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    target_role_id BIGINT REFERENCES roles(id) ON DELETE SET NULL,
    permission_id BIGINT REFERENCES permissions(id) ON DELETE SET NULL,
    performed_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_state JSONB, -- State before the change
    new_state JSONB, -- State after the change
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_permission_audit_action (action_type),
    INDEX idx_permission_audit_target_user (target_user_id),
    INDEX idx_permission_audit_target_role (target_role_id),
    INDEX idx_permission_audit_permission (permission_id),
    INDEX idx_permission_audit_performed_by (performed_by),
    INDEX idx_permission_audit_created (created_at)
);

-- ================================================================
-- RBAC FUNCTIONS
-- ================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    user_id_param BIGINT,
    permission_slug_param VARCHAR(150),
    resource_id_param BIGINT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    permission_id_var BIGINT;
    has_permission BOOLEAN := false;
    user_perm_record RECORD;
    role_perm_record RECORD;
BEGIN
    -- Get permission ID
    SELECT id INTO permission_id_var
    FROM permissions
    WHERE slug = permission_slug_param;
    
    IF permission_id_var IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check direct user permissions first (highest priority)
    SELECT granted, expires_at INTO user_perm_record
    FROM user_permissions
    WHERE user_id = user_id_param 
      AND permission_id = permission_id_var
      AND (resource_id_param IS NULL OR resource_id = resource_id_param)
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY granted DESC -- Prefer grants over denies
    LIMIT 1;
    
    -- If user has explicit permission (grant or deny)
    IF FOUND THEN
        RETURN user_perm_record.granted;
    END IF;
    
    -- Check role-based permissions (ordered by role level - higher authority first)
    FOR role_perm_record IN
        SELECT rp.granted
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        WHERE ur.user_id = user_id_param
          AND ur.status = 'active'
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND rp.permission_id = permission_id_var
          AND r.status = 'active'
        ORDER BY r.level ASC -- Lower level = higher authority
    LOOP
        -- Return the first match (highest authority role)
        RETURN role_perm_record.granted;
    END LOOP;
    
    -- Default deny
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param BIGINT)
RETURNS TABLE(
    permission_slug VARCHAR(150),
    permission_name VARCHAR(150),
    granted BOOLEAN,
    source VARCHAR(20), -- 'user' or 'role'
    source_name VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Return direct user permissions
    RETURN QUERY
    SELECT 
        p.slug,
        p.name,
        up.granted,
        'user'::VARCHAR(20) as source,
        'Direct'::VARCHAR(100) as source_name,
        up.expires_at
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = user_id_param
      AND (up.expires_at IS NULL OR up.expires_at > NOW());
    
    -- Return role-based permissions
    RETURN QUERY
    SELECT DISTINCT
        p.slug,
        p.name,
        rp.granted,
        'role'::VARCHAR(20) as source,
        r.name as source_name,
        ur.expires_at
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id_param
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      AND r.status = 'active'
    ORDER BY permission_slug, source, source_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check role hierarchy (can role A manage role B?)
CREATE OR REPLACE FUNCTION can_role_manage_role(
    manager_role_level INTEGER,
    target_role_level INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Lower level number = higher authority
    RETURN manager_role_level < target_role_level;
END;
$$ LANGUAGE plpgsql;

-- Function to get role hierarchy
CREATE OR REPLACE FUNCTION get_role_hierarchy()
RETURNS TABLE(
    role_id BIGINT,
    role_name VARCHAR(100),
    role_slug VARCHAR(100),
    role_level INTEGER,
    parent_role_id BIGINT,
    parent_role_name VARCHAR(100),
    user_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.slug,
        r.level,
        r.parent_role_id,
        pr.name as parent_name,
        COALESCE(ur_count.user_count, 0) as user_count
    FROM roles r
    LEFT JOIN roles pr ON r.parent_role_id = pr.id
    LEFT JOIN (
        SELECT role_id, COUNT(*) as user_count
        FROM user_roles
        WHERE status = 'active'
        GROUP BY role_id
    ) ur_count ON r.id = ur_count.role_id
    WHERE r.status = 'active'
    ORDER BY r.level ASC, r.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- RBAC TRIGGERS
-- ================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rbac_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_rbac_timestamp();

-- Trigger to prevent circular role hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_role_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    current_role_id BIGINT;
    max_depth INTEGER := 10;
    depth INTEGER := 0;
BEGIN
    -- Check for circular reference
    current_role_id := NEW.parent_role_id;
    
    WHILE current_role_id IS NOT NULL AND depth < max_depth LOOP
        -- If we find our own ID in the parent chain, it's circular
        IF current_role_id = NEW.id THEN
            RAISE EXCEPTION 'Circular role hierarchy detected. Role cannot be its own ancestor.';
        END IF;
        
        -- Move to next parent
        SELECT parent_role_id INTO current_role_id
        FROM roles
        WHERE id = current_role_id;
        
        depth := depth + 1;
    END LOOP;
    
    -- Check for maximum depth
    IF depth >= max_depth THEN
        RAISE EXCEPTION 'Role hierarchy too deep. Maximum depth is %.', max_depth;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for circular hierarchy prevention
DROP TRIGGER IF EXISTS trigger_prevent_circular_hierarchy ON roles;
CREATE TRIGGER trigger_prevent_circular_hierarchy
    BEFORE INSERT OR UPDATE ON roles
    FOR EACH ROW
    WHEN (NEW.parent_role_id IS NOT NULL)
    EXECUTE FUNCTION prevent_circular_role_hierarchy();

-- Trigger to log permission changes
CREATE OR REPLACE FUNCTION log_permission_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type_var VARCHAR(50);
    previous_state_var JSONB;
    new_state_var JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type_var := TG_TABLE_NAME || '_created';
        previous_state_var := NULL;
        new_state_var := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type_var := TG_TABLE_NAME || '_updated';
        previous_state_var := to_jsonb(OLD);
        new_state_var := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type_var := TG_TABLE_NAME || '_deleted';
        previous_state_var := to_jsonb(OLD);
        new_state_var := NULL;
    END IF;
    
    -- Log the change
    INSERT INTO permission_audit_log (
        action_type,
        target_user_id,
        target_role_id,
        permission_id,
        performed_by,
        previous_state,
        new_state
    ) VALUES (
        action_type_var,
        COALESCE(NEW.user_id, OLD.user_id),
        COALESCE(NEW.role_id, OLD.role_id),
        COALESCE(NEW.permission_id, OLD.permission_id),
        COALESCE(NEW.granted_by, OLD.granted_by, NEW.assigned_by, OLD.assigned_by, NEW.created_by, OLD.created_by),
        previous_state_var,
        new_state_var
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS trigger_audit_role_permissions ON role_permissions;
CREATE TRIGGER trigger_audit_role_permissions
    AFTER INSERT OR UPDATE OR DELETE ON role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION log_permission_changes();

DROP TRIGGER IF EXISTS trigger_audit_user_roles ON user_roles;
CREATE TRIGGER trigger_audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION log_permission_changes();

DROP TRIGGER IF EXISTS trigger_audit_user_permissions ON user_permissions;
CREATE TRIGGER trigger_audit_user_permissions
    AFTER INSERT OR UPDATE OR DELETE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION log_permission_changes();

-- ================================================================
-- INITIAL SYSTEM DATA
-- ================================================================

-- Insert system roles
INSERT INTO roles (name, slug, description, level, parent_role_id, is_system_role, created_by) VALUES
('Master Admin', 'master_admin', 'Full system access with all permissions', 1, NULL, true, 1),
('Admin', 'admin', 'Administrative access with most permissions', 2, 1, true, 1),
('Consultant', 'consultant', 'Consultant with assigned companies/projects', 3, 2, true, 1),
('Company Owner', 'company_owner', 'Company management permissions', 4, NULL, true, 1),
('Company Manager', 'company_manager', 'Limited company management', 5, 4, true, 1),
('Company Personnel', 'company_personnel', 'Basic company access', 6, 5, true, 1),
('Guest', 'guest', 'Limited read-only access', 10, NULL, true, 1)
ON CONFLICT (slug) DO NOTHING;

-- Insert system permissions
INSERT INTO permissions (name, slug, resource, action, description, is_system_permission, category) VALUES
-- System Management
('View System Settings', 'system.view', 'system', 'view', 'View system configuration and settings', true, 'system'),
('Edit System Settings', 'system.edit', 'system', 'edit', 'Modify system configuration and settings', true, 'system'),
('Manage Roles', 'roles.manage', 'roles', 'manage', 'Create, edit, and delete user roles', true, 'system'),
('Manage Permissions', 'permissions.manage', 'permissions', 'manage', 'Assign and revoke permissions', true, 'system'),

-- Company Management
('View All Companies', 'companies.view_all', 'companies', 'view_all', 'View all companies in the system', true, 'company_management'),
('View Own Company', 'companies.view_own', 'companies', 'view_own', 'View own company information', true, 'company_management'),
('Create Companies', 'companies.create', 'companies', 'create', 'Create new companies', true, 'company_management'),
('Edit All Companies', 'companies.edit_all', 'companies', 'edit_all', 'Edit any company information', true, 'company_management'),
('Edit Own Company', 'companies.edit_own', 'companies', 'edit_own', 'Edit own company information', true, 'company_management'),
('Delete Companies', 'companies.delete', 'companies', 'delete', 'Delete companies from the system', true, 'company_management'),

-- Project Management
('View All Projects', 'projects.view_all', 'projects', 'view_all', 'View all projects in the system', true, 'project_management'),
('View Assigned Projects', 'projects.view_assigned', 'projects', 'view_assigned', 'View assigned projects only', true, 'project_management'),
('Create Projects', 'projects.create', 'projects', 'create', 'Create new projects', true, 'project_management'),
('Edit All Projects', 'projects.edit_all', 'projects', 'edit_all', 'Edit any project', true, 'project_management'),
('Edit Assigned Projects', 'projects.edit_assigned', 'projects', 'edit_assigned', 'Edit assigned projects only', true, 'project_management'),
('Delete Projects', 'projects.delete', 'projects', 'delete', 'Delete projects from the system', true, 'project_management'),

-- User Management
('View All Users', 'users.view_all', 'users', 'view_all', 'View all users in the system', true, 'user_management'),
('View Company Users', 'users.view_company', 'users', 'view_company', 'View users within same company', true, 'user_management'),
('Create Users', 'users.create', 'users', 'create', 'Create new user accounts', true, 'user_management'),
('Edit All Users', 'users.edit_all', 'users', 'edit_all', 'Edit any user account', true, 'user_management'),
('Edit Company Users', 'users.edit_company', 'users', 'edit_company', 'Edit users within same company', true, 'user_management'),
('Delete Users', 'users.delete', 'users', 'delete', 'Delete user accounts', true, 'user_management'),

-- Education Management
('View All Education', 'education.view_all', 'education', 'view_all', 'View all education programs', true, 'education_management'),
('View Assigned Education', 'education.view_assigned', 'education', 'view_assigned', 'View assigned education programs', true, 'education_management'),
('Participate Education', 'education.participate', 'education', 'participate', 'Participate in education programs', true, 'education_management'),
('Create Education', 'education.create', 'education', 'create', 'Create new education programs', true, 'education_management'),
('Edit Education', 'education.edit', 'education', 'edit', 'Edit education programs', true, 'education_management'),

-- Event Management
('View All Events', 'events.view_all', 'events', 'view_all', 'View all events in the system', true, 'event_management'),
('View Public Events', 'events.view_public', 'events', 'view_public', 'View public events only', true, 'event_management'),
('Register Events', 'events.register', 'events', 'register', 'Register for events', true, 'event_management'),
('Create Events', 'events.create', 'events', 'create', 'Create new events', true, 'event_management'),
('Edit Events', 'events.edit', 'events', 'edit', 'Edit event information', true, 'event_management'),

-- Content Management
('View Content', 'content.view', 'content', 'view', 'View content and documents', true, 'content_management'),
('Create Content', 'content.create', 'content', 'create', 'Create new content', true, 'content_management'),
('Edit Content', 'content.edit', 'content', 'edit', 'Edit existing content', true, 'content_management'),
('Publish Content', 'content.publish', 'content', 'publish', 'Publish content to public', true, 'content_management'),

-- Reporting
('View All Reports', 'reports.view_all', 'reports', 'view_all', 'View all system reports', true, 'reporting'),
('View Own Reports', 'reports.view_own', 'reports', 'view_own', 'View own reports only', true, 'reporting'),
('Create Reports', 'reports.create', 'reports', 'create', 'Create new reports', true, 'reporting'),
('Export Reports', 'reports.export', 'reports', 'export', 'Export reports to various formats', true, 'reporting')
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- RBAC VIEWS FOR REPORTING
-- ================================================================

-- View for user permissions overview
CREATE OR REPLACE VIEW v_user_permissions_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.role_type,
    u.status as user_status,
    -- Role information
    STRING_AGG(DISTINCT r.name, ', ') as assigned_roles,
    COUNT(DISTINCT ur.role_id) as role_count,
    -- Permission information
    COUNT(DISTINCT rp.permission_id) as role_permissions_count,
    COUNT(DISTINCT up.permission_id) as direct_permissions_count,
    -- Status information
    CASE 
        WHEN COUNT(ur.id) > 0 THEN 'Has Roles'
        WHEN COUNT(up.id) > 0 THEN 'Direct Permissions Only'
        ELSE 'No Permissions'
    END as permission_status
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.status = 'active'
LEFT JOIN roles r ON ur.role_id = r.id AND r.status = 'active'
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.granted = true
LEFT JOIN user_permissions up ON u.id = up.user_id AND up.granted = true
WHERE u.status = 'active'
GROUP BY u.id, u.email, u.full_name, u.role_type, u.status
ORDER BY u.full_name;

-- View for role permissions overview
CREATE OR REPLACE VIEW v_role_permissions_overview AS
SELECT 
    r.id as role_id,
    r.name as role_name,
    r.slug as role_slug,
    r.level as role_level,
    r.status as role_status,
    pr.name as parent_role_name,
    COUNT(DISTINCT rp.permission_id) as permission_count,
    COUNT(DISTINCT ur.user_id) as user_count,
    STRING_AGG(DISTINCT p.category, ', ') as permission_categories
FROM roles r
LEFT JOIN roles pr ON r.parent_role_id = pr.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.granted = true
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.status = 'active'
WHERE r.status = 'active'
GROUP BY r.id, r.name, r.slug, r.level, r.status, pr.name
ORDER BY r.level ASC, r.name ASC;

-- View for permission usage overview
CREATE OR REPLACE VIEW v_permission_usage_overview AS
SELECT 
    p.id as permission_id,
    p.name as permission_name,
    p.slug as permission_slug,
    p.resource,
    p.action,
    p.category,
    COUNT(DISTINCT rp.role_id) as assigned_to_roles,
    COUNT(DISTINCT up.user_id) as assigned_to_users,
    COUNT(DISTINCT ur.user_id) as effective_users, -- Users who have this permission through roles
    CASE 
        WHEN COUNT(DISTINCT rp.role_id) > 0 OR COUNT(DISTINCT up.user_id) > 0 THEN 'Used'
        ELSE 'Unused'
    END as usage_status
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.granted = true
LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.granted = true
LEFT JOIN user_roles ur ON rp.role_id = ur.role_id AND ur.status = 'active'
GROUP BY p.id, p.name, p.slug, p.resource, p.action, p.category
ORDER BY p.category, p.resource, p.action;

-- ================================================================
-- COMMENTS AND DOCUMENTATION
-- ================================================================

COMMENT ON TABLE roles IS 'Hierarchical role definitions with inheritance support';
COMMENT ON TABLE permissions IS 'Granular permission definitions for resources and actions';
COMMENT ON TABLE role_permissions IS 'Links roles to permissions with grant/deny capability';
COMMENT ON TABLE user_roles IS 'Assigns roles to users with temporal support';
COMMENT ON TABLE user_permissions IS 'Direct user permissions that override role permissions';
COMMENT ON TABLE permission_audit_log IS 'Comprehensive audit trail for all permission changes';

COMMENT ON FUNCTION user_has_permission(BIGINT, VARCHAR, BIGINT) IS 'Checks if user has specific permission with optional resource context';
COMMENT ON FUNCTION get_user_permissions(BIGINT) IS 'Returns all permissions for a user from roles and direct assignments';
COMMENT ON FUNCTION can_role_manage_role(INTEGER, INTEGER) IS 'Checks if one role can manage another based on hierarchy';
COMMENT ON FUNCTION get_role_hierarchy() IS 'Returns complete role hierarchy with user counts';

COMMENT ON VIEW v_user_permissions_overview IS 'Summary view of user permissions and role assignments';
COMMENT ON VIEW v_role_permissions_overview IS 'Summary view of role permissions and user assignments';
COMMENT ON VIEW v_permission_usage_overview IS 'Analysis view of permission usage across roles and users';
