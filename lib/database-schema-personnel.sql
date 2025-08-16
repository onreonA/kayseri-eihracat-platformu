-- ================================================================
-- PERSONNEL MANAGEMENT TABLES
-- Phase 2.3: Company sub-user system (max 3 personnel)
-- ================================================================

-- Personnel Invitations Table
-- Stores email invitations sent to potential personnel
CREATE TABLE IF NOT EXISTS personnel_invitations (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    invited_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Indexes
    CONSTRAINT unique_company_email_pending UNIQUE (company_id, email, status),
    INDEX idx_personnel_invitations_token (invitation_token),
    INDEX idx_personnel_invitations_company (company_id),
    INDEX idx_personnel_invitations_email (email),
    INDEX idx_personnel_invitations_status (status),
    INDEX idx_personnel_invitations_expires (expires_at)
);

-- Company Personnel Table
-- Links users to companies as personnel with specific permissions
CREATE TABLE IF NOT EXISTS company_personnel (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position VARCHAR(100),
    department VARCHAR(100),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_invitation')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_at TIMESTAMP WITH TIME ZONE,
    invited_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT unique_company_user_active UNIQUE (company_id, user_id, status),
    
    -- Indexes
    INDEX idx_company_personnel_company (company_id),
    INDEX idx_company_personnel_user (user_id),
    INDEX idx_company_personnel_status (status),
    INDEX idx_company_personnel_joined (joined_at)
);

-- Personnel Activity Log
-- Tracks personnel actions for audit purposes
CREATE TABLE IF NOT EXISTS personnel_activity_log (
    id BIGSERIAL PRIMARY KEY,
    personnel_id BIGINT NOT NULL REFERENCES company_personnel(id) ON DELETE CASCADE,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'login', 'project_view', 'education_complete', etc.
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_personnel_activity_personnel (personnel_id),
    INDEX idx_personnel_activity_company (company_id),
    INDEX idx_personnel_activity_type (action_type),
    INDEX idx_personnel_activity_date (created_at)
);

-- ================================================================
-- PERSONNEL PERMISSION FUNCTIONS
-- ================================================================

-- Function to check if company can add more personnel
CREATE OR REPLACE FUNCTION can_add_personnel(company_id_param BIGINT)
RETURNS JSONB AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
    result JSONB;
BEGIN
    -- Get current active personnel count
    SELECT COUNT(*) INTO current_count
    FROM company_personnel
    WHERE company_id = company_id_param AND status = 'active';
    
    -- Get max allowed from companies table
    SELECT COALESCE(max_personnel, 3) INTO max_allowed
    FROM companies
    WHERE id = company_id_param;
    
    -- Build result
    result := jsonb_build_object(
        'can_add', current_count < max_allowed,
        'current_count', current_count,
        'max_allowed', max_allowed,
        'reason', CASE 
            WHEN current_count >= max_allowed THEN 'Maximum personnel limit reached'
            ELSE NULL
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get personnel permissions
CREATE OR REPLACE FUNCTION get_personnel_permissions(user_id_param BIGINT, company_id_param BIGINT)
RETURNS JSONB AS $$
DECLARE
    permissions JSONB;
BEGIN
    -- Get personnel permissions
    SELECT COALESCE(cp.permissions, '[]'::jsonb) INTO permissions
    FROM company_personnel cp
    WHERE cp.user_id = user_id_param 
      AND cp.company_id = company_id_param 
      AND cp.status = 'active';
    
    -- Return empty array if no personnel record found
    RETURN COALESCE(permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION has_personnel_permission(
    user_id_param BIGINT, 
    company_id_param BIGINT, 
    permission_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    permissions JSONB;
BEGIN
    -- Get personnel permissions
    SELECT get_personnel_permissions(user_id_param, company_id_param) INTO permissions;
    
    -- Check if permission exists in array
    RETURN permissions ? permission_param;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PERSONNEL TRIGGERS
-- ================================================================

-- Trigger to auto-expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Update expired invitations
    UPDATE personnel_invitations
    SET status = 'expired'
    WHERE status = 'pending' 
      AND expires_at < NOW()
      AND id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invitation expiry
DROP TRIGGER IF EXISTS trigger_expire_invitations ON personnel_invitations;
CREATE TRIGGER trigger_expire_invitations
    BEFORE UPDATE ON personnel_invitations
    FOR EACH ROW
    EXECUTE FUNCTION expire_old_invitations();

-- Trigger to log personnel activity
CREATE OR REPLACE FUNCTION log_personnel_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log personnel creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO personnel_activity_log (
            personnel_id, 
            company_id, 
            action_type, 
            action_details
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'personnel_added',
            jsonb_build_object(
                'invited_by', NEW.invited_by,
                'position', NEW.position,
                'department', NEW.department
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log personnel status change
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO personnel_activity_log (
            personnel_id, 
            company_id, 
            action_type, 
            action_details
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for personnel activity logging
DROP TRIGGER IF EXISTS trigger_personnel_activity ON company_personnel;
CREATE TRIGGER trigger_personnel_activity
    AFTER INSERT OR UPDATE ON company_personnel
    FOR EACH ROW
    EXECUTE FUNCTION log_personnel_activity();

-- ================================================================
-- PERSONNEL INDEXES FOR PERFORMANCE
-- ================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_personnel_company_status 
    ON company_personnel(company_id, status);

CREATE INDEX IF NOT EXISTS idx_personnel_user_company 
    ON company_personnel(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_invitations_company_status 
    ON personnel_invitations(company_id, status);

CREATE INDEX IF NOT EXISTS idx_invitations_email_status 
    ON personnel_invitations(email, status);

-- ================================================================
-- SAMPLE DATA FOR TESTING
-- ================================================================

-- Note: This would be populated through the application
-- Sample companies should already exist from previous schema

-- Sample personnel invitations (pending)
INSERT INTO personnel_invitations (
    company_id, 
    email, 
    position, 
    department, 
    permissions, 
    invited_by, 
    invitation_token, 
    expires_at
) VALUES 
(1, 'personel1@sahbaz.com.tr', 'Proje Koordinatörü', 'İhracat', 
 '["project.view", "education.view", "education.participate"]'::jsonb, 
 1, 'inv_1733500000_abc123', NOW() + INTERVAL '7 days'),
(1, 'personel2@sahbaz.com.tr', 'Asistan', 'Pazarlama', 
 '["project.view", "forum.view", "forum.post"]'::jsonb, 
 1, 'inv_1733500001_def456', NOW() + INTERVAL '7 days'),
(2, 'staj@aekaonline.com', 'Stajyer', 'Genel', 
 '["project.view", "education.view"]'::jsonb, 
 2, 'inv_1733500002_ghi789', NOW() + INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- ================================================================
-- PERSONNEL VIEWS FOR REPORTING
-- ================================================================

-- View for personnel overview
CREATE OR REPLACE VIEW v_personnel_overview AS
SELECT 
    cp.id,
    cp.company_id,
    c.company_name,
    c.max_personnel,
    cp.user_id,
    u.email,
    u.full_name,
    u.phone,
    cp.position,
    cp.department,
    cp.permissions,
    cp.status,
    cp.joined_at,
    cp.invited_by,
    inviter.full_name AS invited_by_name,
    -- Permission counts
    jsonb_array_length(cp.permissions) AS permission_count,
    -- Activity summary (last 30 days)
    COALESCE(activity.activity_count, 0) AS recent_activity_count
FROM company_personnel cp
JOIN companies c ON cp.company_id = c.id
JOIN users u ON cp.user_id = u.id
LEFT JOIN users inviter ON cp.invited_by = inviter.id
LEFT JOIN (
    SELECT 
        personnel_id,
        COUNT(*) AS activity_count
    FROM personnel_activity_log
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY personnel_id
) activity ON cp.id = activity.personnel_id
ORDER BY cp.joined_at DESC;

-- View for invitation overview
CREATE OR REPLACE VIEW v_invitation_overview AS
SELECT 
    pi.id,
    pi.company_id,
    c.company_name,
    pi.email,
    pi.position,
    pi.department,
    pi.permissions,
    pi.status,
    pi.invited_at,
    pi.expires_at,
    pi.invited_by,
    inviter.full_name AS invited_by_name,
    -- Time calculations
    CASE 
        WHEN pi.expires_at < NOW() AND pi.status = 'pending' THEN 'expired'
        WHEN pi.expires_at > NOW() AND pi.status = 'pending' THEN 'valid'
        ELSE pi.status
    END AS effective_status,
    DATE_PART('day', pi.expires_at - NOW()) AS days_until_expiry
FROM personnel_invitations pi
JOIN companies c ON pi.company_id = c.id
JOIN users inviter ON pi.invited_by = inviter.id
ORDER BY pi.invited_at DESC;

-- View for company personnel summary
CREATE OR REPLACE VIEW v_company_personnel_summary AS
SELECT 
    c.id AS company_id,
    c.company_name,
    c.max_personnel,
    COALESCE(active_count.count, 0) AS active_personnel_count,
    COALESCE(pending_invitations.count, 0) AS pending_invitations_count,
    (c.max_personnel - COALESCE(active_count.count, 0)) AS available_slots,
    CASE 
        WHEN COALESCE(active_count.count, 0) >= c.max_personnel THEN false
        ELSE true
    END AS can_add_more
FROM companies c
LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM company_personnel
    WHERE status = 'active'
    GROUP BY company_id
) active_count ON c.id = active_count.company_id
LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM personnel_invitations
    WHERE status = 'pending' AND expires_at > NOW()
    GROUP BY company_id
) pending_invitations ON c.id = pending_invitations.company_id
ORDER BY c.company_name;

-- ================================================================
-- COMMENTS AND DOCUMENTATION
-- ================================================================

COMMENT ON TABLE personnel_invitations IS 'Stores email invitations for company personnel';
COMMENT ON TABLE company_personnel IS 'Links users to companies as personnel with permissions';
COMMENT ON TABLE personnel_activity_log IS 'Tracks personnel actions for audit purposes';

COMMENT ON FUNCTION can_add_personnel(BIGINT) IS 'Checks if company can add more personnel based on limits';
COMMENT ON FUNCTION get_personnel_permissions(BIGINT, BIGINT) IS 'Gets permissions for a personnel user in specific company';
COMMENT ON FUNCTION has_personnel_permission(BIGINT, BIGINT, TEXT) IS 'Checks if personnel has specific permission';

COMMENT ON VIEW v_personnel_overview IS 'Comprehensive view of all personnel with activity metrics';
COMMENT ON VIEW v_invitation_overview IS 'Overview of all personnel invitations with status';
COMMENT ON VIEW v_company_personnel_summary IS 'Summary of personnel counts per company';
