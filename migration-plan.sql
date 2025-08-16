-- ================================================================
-- MIGRATION PLAN: firmalar -> New Multi-User Schema
-- PHASE 2.1: Safe migration with zero downtime
-- ================================================================

-- ================================================================
-- STEP 1: CREATE NEW TABLES (Parallel to existing)
-- ================================================================

-- Execute the new schema creation (from database-schema-design.sql)
-- This creates all new tables without affecting existing ones

-- ================================================================
-- STEP 2: DATA MIGRATION FROM EXISTING TABLES
-- ================================================================

-- 2.1: Migrate existing firmalar to new schema
-- Create users for each firma owner
INSERT INTO users (email, full_name, phone, role_type, status, created_at)
SELECT 
    yetkili_email as email,
    COALESCE(yetkili_adi, 'Firma Yetkilisi') as full_name,
    telefon as phone,
    'company_owner' as role_type,
    CASE WHEN durum = 'Aktif' THEN 'active' ELSE 'inactive' END as status,
    COALESCE(created_at, NOW()) as created_at
FROM firmalar
WHERE yetkili_email IS NOT NULL
ON CONFLICT (email) DO NOTHING; -- Skip if email already exists

-- 2.2: Create companies linked to users
INSERT INTO companies (
    company_name, 
    sector, 
    address, 
    owner_user_id, 
    status, 
    profile_completion_status,
    created_at,
    max_personnel
)
SELECT 
    f.firma_adi as company_name,
    f.sektor as sector,
    f.adres as address,
    u.id as owner_user_id,
    CASE WHEN f.durum = 'Aktif' THEN 'active' ELSE 'inactive' END as status,
    CASE 
        WHEN f.firma_profil_durumu = 'Tamamlandı' THEN 'complete'
        WHEN f.firma_profil_durumu = 'Onay Bekliyor' THEN 'pending_review'
        ELSE 'incomplete'
    END as profile_completion_status,
    COALESCE(f.created_at, NOW()) as created_at,
    3 as max_personnel -- Default max personnel
FROM firmalar f
INNER JOIN users u ON u.email = f.yetkili_email
WHERE f.firma_adi IS NOT NULL;

-- ================================================================
-- STEP 3: CREATE MASTER ADMIN USER
-- ================================================================

-- Insert master admin (if not exists)
INSERT INTO users (email, full_name, role_type, status, created_at)
VALUES ('bilgi@omerfarukunsal.com', 'Master Admin', 'master_admin', 'active', NOW())
ON CONFLICT (email) DO UPDATE SET role_type = 'master_admin';

-- ================================================================
-- STEP 4: CREATE MIGRATION VERIFICATION VIEWS
-- ================================================================

-- View to verify migration success
CREATE OR REPLACE VIEW migration_verification AS
SELECT 
    'firmalar' as source_table,
    COUNT(*) as record_count
FROM firmalar
WHERE yetkili_email IS NOT NULL

UNION ALL

SELECT 
    'users (company_owner)' as source_table,
    COUNT(*) as record_count
FROM users
WHERE role_type = 'company_owner'

UNION ALL

SELECT 
    'companies' as source_table,
    COUNT(*) as record_count
FROM companies;

-- View to check data integrity
CREATE OR REPLACE VIEW data_integrity_check AS
SELECT 
    f.id as firma_id,
    f.firma_adi,
    f.yetkili_email,
    u.id as user_id,
    c.id as company_id,
    CASE 
        WHEN u.id IS NULL THEN 'Missing User'
        WHEN c.id IS NULL THEN 'Missing Company'
        ELSE 'OK'
    END as status
FROM firmalar f
LEFT JOIN users u ON u.email = f.yetkili_email
LEFT JOIN companies c ON c.owner_user_id = u.id
WHERE f.yetkili_email IS NOT NULL;

-- ================================================================
-- STEP 5: BACKWARD COMPATIBILITY FUNCTIONS
-- ================================================================

-- Function to get company data in old format (for existing code)
CREATE OR REPLACE FUNCTION get_firmalar_compatible()
RETURNS TABLE (
    id INTEGER,
    firma_adi VARCHAR(100),
    yetkili_adi VARCHAR(100),
    yetkili_email VARCHAR(255),
    telefon VARCHAR(20),
    durum VARCHAR(20),
    firma_profil_durumu VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE,
    adres TEXT,
    sektor VARCHAR(50),
    sifre VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.company_name as firma_adi,
        u.full_name as yetkili_adi,
        u.email as yetkili_email,
        u.phone as telefon,
        c.status as durum,
        c.profile_completion_status as firma_profil_durumu,
        c.created_at,
        c.address as adres,
        c.sector as sektor,
        '123456' as sifre -- Default password for compatibility
    FROM companies c
    INNER JOIN users u ON u.id = c.owner_user_id
    WHERE c.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 6: GRADUAL CUTOVER STRATEGY
-- ================================================================

-- 6.1: Phase 1 - Parallel Operation
-- - New schema exists alongside old
-- - New features use new schema
-- - Old features continue using old schema via compatibility functions

-- 6.2: Phase 2 - Data Sync
-- - Implement triggers to keep data in sync between old and new schemas
-- - Test thoroughly with both schemas

-- 6.3: Phase 3 - Cutover
-- - Switch all code to use new schema
-- - Archive old schema tables (don't drop immediately)

-- ================================================================
-- STEP 7: ROLLBACK PLAN
-- ================================================================

-- Create rollback script (to be executed if needed)
CREATE OR REPLACE FUNCTION rollback_migration()
RETURNS VOID AS $$
BEGIN
    -- Drop new tables in reverse dependency order
    DROP TABLE IF EXISTS activity_logs CASCADE;
    DROP TABLE IF EXISTS user_sessions CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS role_definitions CASCADE;
    DROP TABLE IF EXISTS consultants CASCADE;
    DROP TABLE IF EXISTS company_personnel CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    -- Drop views
    DROP VIEW IF EXISTS migration_verification CASCADE;
    DROP VIEW IF EXISTS data_integrity_check CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS get_firmalar_compatible() CASCADE;
    DROP FUNCTION IF EXISTS check_company_personnel_limit() CASCADE;
    DROP FUNCTION IF EXISTS update_consultant_company_count() CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    
    RAISE NOTICE 'Migration rollback completed';
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 8: MIGRATION EXECUTION CHECKLIST
-- ================================================================

/*
MIGRATION EXECUTION CHECKLIST:

□ 1. Backup existing database
□ 2. Execute database-schema-design.sql (create new tables)
□ 3. Execute this migration-plan.sql (migrate data)
□ 4. Verify migration using migration_verification view
□ 5. Check data integrity using data_integrity_check view
□ 6. Test compatibility functions
□ 7. Update application code to use new schema (gradual)
□ 8. Monitor system performance
□ 9. Archive old tables when stable
□ 10. Document new schema for team

ROLLBACK PROCEDURE (if needed):
□ 1. Stop application
□ 2. Execute: SELECT rollback_migration();
□ 3. Restore from backup
□ 4. Restart application

*/

-- ================================================================
-- STEP 9: PERFORMANCE OPTIMIZATION
-- ================================================================

-- Analyze tables after migration
ANALYZE users;
ANALYZE companies;
ANALYZE company_personnel;
ANALYZE consultants;

-- Vacuum to optimize storage
VACUUM users;
VACUUM companies;
VACUUM company_personnel;
VACUUM consultants;
