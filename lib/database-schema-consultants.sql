-- ================================================================
-- CONSULTANT MANAGEMENT TABLES
-- Phase 2.4: Admin consultant management system
-- ================================================================

-- Consultants Table
-- Stores consultant profiles with specializations and capacity limits
CREATE TABLE IF NOT EXISTS consultants (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization JSONB NOT NULL DEFAULT '[]'::jsonb,
    department VARCHAR(100),
    title VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    hire_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    max_companies INTEGER DEFAULT 10 CHECK (max_companies > 0),
    max_projects INTEGER DEFAULT 20 CHECK (max_projects > 0),
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_consultant_user UNIQUE (user_id),
    
    -- Indexes
    INDEX idx_consultants_user_id (user_id),
    INDEX idx_consultants_status (status),
    INDEX idx_consultants_created_by (created_by),
    INDEX idx_consultants_specialization USING GIN (specialization)
);

-- Consultant Assignments Table
-- Links consultants to companies, projects, education programs, or events
CREATE TABLE IF NOT EXISTS consultant_assignments (
    id BIGSERIAL PRIMARY KEY,
    consultant_id BIGINT NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('company', 'project', 'education_program', 'event')),
    entity_id BIGINT NOT NULL, -- ID of the assigned entity (company_id, project_id, etc.)
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_active_assignment UNIQUE (consultant_id, assignment_type, entity_id, status),
    
    -- Indexes
    INDEX idx_consultant_assignments_consultant (consultant_id),
    INDEX idx_consultant_assignments_type_entity (assignment_type, entity_id),
    INDEX idx_consultant_assignments_assigned_by (assigned_by),
    INDEX idx_consultant_assignments_status (status),
    INDEX idx_consultant_assignments_dates (start_date, end_date)
);

-- Consultant Performance Metrics Table
-- Tracks consultant performance over time
CREATE TABLE IF NOT EXISTS consultant_performance (
    id BIGSERIAL PRIMARY KEY,
    consultant_id BIGINT NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    companies_managed INTEGER DEFAULT 0,
    projects_completed INTEGER DEFAULT 0,
    client_satisfaction_score DECIMAL(3,2), -- 0.00 to 5.00
    response_time_hours INTEGER, -- Average response time in hours
    tasks_completed INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    training_sessions_given INTEGER DEFAULT 0,
    events_organized INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12,2), -- Optional: revenue attributed to consultant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_consultant_period UNIQUE (consultant_id, period_start, period_end, period_type),
    
    -- Indexes
    INDEX idx_consultant_performance_consultant (consultant_id),
    INDEX idx_consultant_performance_period (period_start, period_end),
    INDEX idx_consultant_performance_type (period_type)
);

-- Consultant Activity Log Table
-- Tracks consultant actions for audit and performance analysis
CREATE TABLE IF NOT EXISTS consultant_activity_log (
    id BIGSERIAL PRIMARY KEY,
    consultant_id BIGINT NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'assignment_started', 'project_completed', 'company_contacted', etc.
    activity_details JSONB,
    entity_type VARCHAR(20), -- 'company', 'project', 'education_program', 'event'
    entity_id BIGINT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_consultant_activity_consultant (consultant_id),
    INDEX idx_consultant_activity_type (activity_type),
    INDEX idx_consultant_activity_entity (entity_type, entity_id),
    INDEX idx_consultant_activity_date (created_at)
);

-- ================================================================
-- CONSULTANT MANAGEMENT FUNCTIONS
-- ================================================================

-- Function to check if consultant can take more assignments
CREATE OR REPLACE FUNCTION can_consultant_take_assignment(
    consultant_id_param BIGINT,
    assignment_type_param VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
    consultant_record RECORD;
    current_companies INTEGER := 0;
    current_projects INTEGER := 0;
    result JSONB;
BEGIN
    -- Get consultant info
    SELECT * INTO consultant_record
    FROM consultants
    WHERE id = consultant_id_param AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Consultant not found or inactive'
        );
    END IF;
    
    -- Count current active assignments
    SELECT 
        COUNT(*) FILTER (WHERE assignment_type = 'company' AND status = 'active'),
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'active')
    INTO current_companies, current_projects
    FROM consultant_assignments
    WHERE consultant_id = consultant_id_param;
    
    -- Check limits based on assignment type
    IF assignment_type_param = 'company' AND current_companies >= consultant_record.max_companies THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', format('Maximum company limit (%s) reached', consultant_record.max_companies),
            'current_count', current_companies,
            'max_allowed', consultant_record.max_companies
        );
    END IF;
    
    IF assignment_type_param = 'project' AND current_projects >= consultant_record.max_projects THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', format('Maximum project limit (%s) reached', consultant_record.max_projects),
            'current_count', current_projects,
            'max_allowed', consultant_record.max_projects
        );
    END IF;
    
    -- Assignment allowed
    RETURN jsonb_build_object(
        'allowed', true,
        'current_companies', current_companies,
        'max_companies', consultant_record.max_companies,
        'current_projects', current_projects,
        'max_projects', consultant_record.max_projects
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get consultant workload percentage
CREATE OR REPLACE FUNCTION get_consultant_workload(consultant_id_param BIGINT)
RETURNS INTEGER AS $$
DECLARE
    consultant_record RECORD;
    current_companies INTEGER := 0;
    current_projects INTEGER := 0;
    total_capacity INTEGER;
    current_load INTEGER;
    workload_percentage INTEGER;
BEGIN
    -- Get consultant info
    SELECT max_companies, max_projects INTO consultant_record
    FROM consultants
    WHERE id = consultant_id_param;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Count current active assignments
    SELECT 
        COUNT(*) FILTER (WHERE assignment_type = 'company' AND status = 'active'),
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'active')
    INTO current_companies, current_projects
    FROM consultant_assignments
    WHERE consultant_id = consultant_id_param;
    
    -- Calculate workload percentage
    total_capacity := consultant_record.max_companies + consultant_record.max_projects;
    current_load := current_companies + current_projects;
    workload_percentage := ROUND((current_load::DECIMAL / total_capacity::DECIMAL) * 100);
    
    RETURN COALESCE(workload_percentage, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get consultant statistics
CREATE OR REPLACE FUNCTION get_consultant_statistics(consultant_id_param BIGINT)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
    active_companies INTEGER := 0;
    active_projects INTEGER := 0;
    completed_projects INTEGER := 0;
    total_assignments INTEGER := 0;
    workload_percentage INTEGER;
BEGIN
    -- Get assignment counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE assignment_type = 'company' AND status = 'active'),
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'active'),
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'completed')
    INTO total_assignments, active_companies, active_projects, completed_projects
    FROM consultant_assignments
    WHERE consultant_id = consultant_id_param;
    
    -- Get workload percentage
    SELECT get_consultant_workload(consultant_id_param) INTO workload_percentage;
    
    -- Build statistics object
    stats := jsonb_build_object(
        'total_assignments', total_assignments,
        'active_companies', active_companies,
        'active_projects', active_projects,
        'completed_projects', completed_projects,
        'workload_percentage', workload_percentage
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- CONSULTANT TRIGGERS
-- ================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consultant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS trigger_consultants_updated_at ON consultants;
CREATE TRIGGER trigger_consultants_updated_at
    BEFORE UPDATE ON consultants
    FOR EACH ROW
    EXECUTE FUNCTION update_consultant_timestamp();

DROP TRIGGER IF EXISTS trigger_consultant_assignments_updated_at ON consultant_assignments;
CREATE TRIGGER trigger_consultant_assignments_updated_at
    BEFORE UPDATE ON consultant_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_consultant_timestamp();

-- Trigger to log consultant activity
CREATE OR REPLACE FUNCTION log_consultant_assignment_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log assignment creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO consultant_activity_log (
            consultant_id,
            activity_type,
            activity_details,
            entity_type,
            entity_id
        ) VALUES (
            NEW.consultant_id,
            'assignment_created',
            jsonb_build_object(
                'assignment_type', NEW.assignment_type,
                'entity_id', NEW.entity_id,
                'assigned_by', NEW.assigned_by,
                'notes', NEW.notes
            ),
            NEW.assignment_type,
            NEW.entity_id
        );
        RETURN NEW;
    END IF;
    
    -- Log assignment status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO consultant_activity_log (
            consultant_id,
            activity_type,
            activity_details,
            entity_type,
            entity_id
        ) VALUES (
            NEW.consultant_id,
            'assignment_status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'assignment_type', NEW.assignment_type,
                'entity_id', NEW.entity_id
            ),
            NEW.assignment_type,
            NEW.entity_id
        );
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assignment activity logging
DROP TRIGGER IF EXISTS trigger_consultant_assignment_activity ON consultant_assignments;
CREATE TRIGGER trigger_consultant_assignment_activity
    AFTER INSERT OR UPDATE ON consultant_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_consultant_assignment_activity();

-- ================================================================
-- CONSULTANT VIEWS FOR REPORTING
-- ================================================================

-- View for consultant overview with statistics
CREATE OR REPLACE VIEW v_consultant_overview AS
SELECT 
    c.id,
    c.user_id,
    u.email,
    u.full_name,
    u.phone,
    c.specialization,
    c.department,
    c.title,
    c.status,
    c.hire_date,
    c.max_companies,
    c.max_projects,
    c.created_by,
    creator.full_name AS created_by_name,
    c.created_at,
    -- Statistics
    COALESCE(active_assignments.active_companies, 0) AS assigned_companies_count,
    COALESCE(active_assignments.active_projects, 0) AS assigned_projects_count,
    COALESCE(completed_assignments.completed_projects, 0) AS completed_projects_count,
    COALESCE(active_assignments.total_active, 0) AS total_active_assignments,
    get_consultant_workload(c.id) AS workload_percentage,
    -- Performance indicators
    CASE 
        WHEN get_consultant_workload(c.id) < 50 THEN 'available'
        WHEN get_consultant_workload(c.id) < 80 THEN 'busy'
        ELSE 'overloaded'
    END AS availability_status
FROM consultants c
JOIN users u ON c.user_id = u.id
JOIN users creator ON c.created_by = creator.id
LEFT JOIN (
    SELECT 
        consultant_id,
        COUNT(*) FILTER (WHERE assignment_type = 'company' AND status = 'active') AS active_companies,
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'active') AS active_projects,
        COUNT(*) FILTER (WHERE status = 'active') AS total_active
    FROM consultant_assignments
    GROUP BY consultant_id
) active_assignments ON c.id = active_assignments.consultant_id
LEFT JOIN (
    SELECT 
        consultant_id,
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'completed') AS completed_projects
    FROM consultant_assignments
    GROUP BY consultant_id
) completed_assignments ON c.id = completed_assignments.consultant_id
ORDER BY c.created_at DESC;

-- View for assignment overview
CREATE OR REPLACE VIEW v_consultant_assignment_overview AS
SELECT 
    ca.id,
    ca.consultant_id,
    c.user_id,
    u.full_name AS consultant_name,
    c.specialization,
    ca.assignment_type,
    ca.entity_id,
    ca.assigned_by,
    assigner.full_name AS assigned_by_name,
    ca.assigned_at,
    ca.status,
    ca.start_date,
    ca.end_date,
    ca.notes,
    -- Duration calculations
    CASE 
        WHEN ca.end_date IS NOT NULL THEN 
            EXTRACT(days FROM ca.end_date - COALESCE(ca.start_date, ca.assigned_at))
        ELSE 
            EXTRACT(days FROM NOW() - COALESCE(ca.start_date, ca.assigned_at))
    END AS duration_days,
    -- Status indicators
    CASE 
        WHEN ca.status = 'active' AND ca.end_date IS NOT NULL AND ca.end_date < NOW() THEN true
        ELSE false
    END AS is_overdue
FROM consultant_assignments ca
JOIN consultants c ON ca.consultant_id = c.id
JOIN users u ON c.user_id = u.id
JOIN users assigner ON ca.assigned_by = assigner.id
ORDER BY ca.assigned_at DESC;

-- View for consultant performance summary
CREATE OR REPLACE VIEW v_consultant_performance_summary AS
SELECT 
    c.id AS consultant_id,
    u.full_name AS consultant_name,
    c.specialization,
    c.status,
    c.hire_date,
    -- Current workload
    get_consultant_workload(c.id) AS current_workload_percentage,
    -- Assignment counts
    COALESCE(assignments.total_assignments, 0) AS total_assignments,
    COALESCE(assignments.active_assignments, 0) AS active_assignments,
    COALESCE(assignments.completed_assignments, 0) AS completed_assignments,
    -- Company and project specifics
    COALESCE(assignments.companies_managed, 0) AS companies_managed,
    COALESCE(assignments.projects_managed, 0) AS projects_managed,
    COALESCE(assignments.projects_completed, 0) AS projects_completed,
    -- Performance indicators
    CASE 
        WHEN COALESCE(assignments.total_assignments, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(assignments.completed_assignments, 0)::DECIMAL / assignments.total_assignments::DECIMAL) * 100)
    END AS completion_rate_percentage,
    -- Recent activity (last 30 days)
    COALESCE(recent_activity.recent_assignments, 0) AS assignments_last_30_days
FROM consultants c
JOIN users u ON c.user_id = u.id
LEFT JOIN (
    SELECT 
        consultant_id,
        COUNT(*) AS total_assignments,
        COUNT(*) FILTER (WHERE status = 'active') AS active_assignments,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_assignments,
        COUNT(DISTINCT entity_id) FILTER (WHERE assignment_type = 'company' AND status = 'active') AS companies_managed,
        COUNT(DISTINCT entity_id) FILTER (WHERE assignment_type = 'project' AND status = 'active') AS projects_managed,
        COUNT(*) FILTER (WHERE assignment_type = 'project' AND status = 'completed') AS projects_completed
    FROM consultant_assignments
    GROUP BY consultant_id
) assignments ON c.id = assignments.consultant_id
LEFT JOIN (
    SELECT 
        consultant_id,
        COUNT(*) AS recent_assignments
    FROM consultant_assignments
    WHERE assigned_at > NOW() - INTERVAL '30 days'
    GROUP BY consultant_id
) recent_activity ON c.id = recent_activity.consultant_id
ORDER BY u.full_name;

-- ================================================================
-- SAMPLE DATA FOR TESTING
-- ================================================================

-- Sample consultant specialization data
-- Note: This assumes users table already has some admin users

-- Insert sample consultants (assuming user IDs 2-4 exist)
INSERT INTO consultants (
    user_id, 
    specialization, 
    department, 
    title, 
    max_companies, 
    max_projects, 
    created_by
) VALUES 
(2, '["project_management", "business_development"]'::jsonb, 'Proje Departmanı', 'Kıdemli Proje Danışmanı', 8, 15, 1),
(3, '["education_coordination", "company_relations"]'::jsonb, 'Eğitim Departmanı', 'Eğitim Koordinatörü', 12, 10, 1),
(4, '["export_consulting", "digital_marketing"]'::jsonb, 'İhracat Departmanı', 'İhracat Uzmanı', 6, 8, 1)
ON CONFLICT (user_id) DO NOTHING;

-- Sample consultant assignments
INSERT INTO consultant_assignments (
    consultant_id,
    assignment_type,
    entity_id,
    assigned_by,
    status,
    start_date,
    notes
) VALUES 
(1, 'company', 1, 1, 'active', NOW() - INTERVAL '30 days', 'Şahbaz İzi firma yönetimi'),
(1, 'company', 2, 1, 'active', NOW() - INTERVAL '20 days', 'Kamer Mobilya firma yönetimi'),
(1, 'project', 1, 1, 'active', NOW() - INTERVAL '15 days', 'E-ihracat projesi yönetimi'),
(2, 'company', 3, 1, 'active', NOW() - INTERVAL '25 days', 'Sarmobi eğitim koordinasyonu'),
(2, 'education_program', 1, 1, 'active', NOW() - INTERVAL '10 days', 'İhracat eğitim programı'),
(3, 'company', 4, 1, 'active', NOW() - INTERVAL '35 days', 'Global Ticaret danışmanlığı'),
(3, 'project', 2, 1, 'completed', NOW() - INTERVAL '60 days', 'Dijital pazarlama projesi')
ON CONFLICT DO NOTHING;

-- ================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ================================================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_consultants_status_specialization 
    ON consultants(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_consultant_assignments_consultant_status 
    ON consultant_assignments(consultant_id, status);

CREATE INDEX IF NOT EXISTS idx_consultant_assignments_type_status 
    ON consultant_assignments(assignment_type, status);

CREATE INDEX IF NOT EXISTS idx_consultant_activity_consultant_date 
    ON consultant_activity_log(consultant_id, created_at DESC);

-- ================================================================
-- COMMENTS AND DOCUMENTATION
-- ================================================================

COMMENT ON TABLE consultants IS 'Stores consultant profiles with specializations and capacity management';
COMMENT ON TABLE consultant_assignments IS 'Links consultants to companies, projects, and programs';
COMMENT ON TABLE consultant_performance IS 'Tracks consultant performance metrics over time';
COMMENT ON TABLE consultant_activity_log IS 'Logs consultant activities for audit and analytics';

COMMENT ON FUNCTION can_consultant_take_assignment(BIGINT, VARCHAR) IS 'Checks if consultant can take additional assignments based on capacity limits';
COMMENT ON FUNCTION get_consultant_workload(BIGINT) IS 'Calculates consultant workload percentage based on current assignments';
COMMENT ON FUNCTION get_consultant_statistics(BIGINT) IS 'Returns comprehensive statistics for a consultant';

COMMENT ON VIEW v_consultant_overview IS 'Comprehensive view of consultants with statistics and performance indicators';
COMMENT ON VIEW v_consultant_assignment_overview IS 'Detailed view of all consultant assignments with metadata';
COMMENT ON VIEW v_consultant_performance_summary IS 'Performance summary for all consultants with key metrics';
