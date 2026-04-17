    -- ═══════════════════════════════════════════════════════════════
    -- Smart E-VISION 2.0 — Master Database Schema
    -- Optimized for Instructional Supervision Archiving
    -- Supabase PostgreSQL with Row Level Security (RLS)
    -- ═══════════════════════════════════════════════════════════════

    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- ─── 01. ORGANIZATIONAL HIERARCHY ─────────────────────────────

    -- Divisions (e.g., DepEd Calapan City)
    CREATE TABLE IF NOT EXISTS divisions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Districts within a Division (e.g., Calapan East)
    CREATE TABLE IF NOT EXISTS districts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(division_id, name)
    );

    -- Schools within a District
    CREATE TABLE IF NOT EXISTS schools (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(district_id, name)
    );

    -- ─── 02. AUTH & USER PROFILES ────────────────────────────────

    -- Profiles (extends auth.users)
    CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL CHECK (role IN ('Teacher', 'School Head', 'Master Teacher', 'District Supervisor')),
        school_id UUID REFERENCES schools(id),
        district_id UUID REFERENCES districts(id),
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        push_subscription JSONB, -- Web Push PWA support
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ─── 03. ACADEMIC MANAGEMENT ────────────────────────────────

    -- Academic Calendar (Weeks & Deadlines)
    CREATE TABLE IF NOT EXISTS academic_calendar (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
        school_year TEXT NOT NULL,
        quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
        week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 52),
        deadline_date TIMESTAMPTZ NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(district_id, school_year, quarter, week_number)
    );

    -- Teaching Loads (Assigned subjects/grades per teacher)
    CREATE TABLE IF NOT EXISTS teaching_loads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        grade_level TEXT NOT NULL,
        subject TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, grade_level, subject)
    );

    -- ─── 04. ARCHIVAL & SUBMISSIONS ─────────────────────────────

    -- Submissions (Core Archival Table)
    CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL, -- Storage path (R2/B2)
        file_hash TEXT NOT NULL UNIQUE, -- SHA-256 for integrity & QR verification
        file_size INTEGER,
        doc_type TEXT NOT NULL CHECK (doc_type IN ('DLL', 'ISP', 'ISR', 'Unknown')),
        week_number INTEGER,
        subject TEXT,
        school_year TEXT DEFAULT '2025-2026',
        calendar_id UUID REFERENCES academic_calendar(id),
        teaching_load_id UUID REFERENCES teaching_loads(id) ON DELETE SET NULL,
        compliance_status TEXT DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'late', 'non-compliant')),
        ai_analysis JSONB, -- Results from NLP/Classifier
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ─── 05. SYSTEM & SUPPORT ────────────────────────────────────

    -- Notifications (Real-time PWA Alerts)
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
        read BOOLEAN DEFAULT FALSE,
        link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit Logs (Blockchain-inspired Activity Tracking)
    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT, -- 'submission', 'profile', etc.
        entity_id UUID,
        details JSONB,
        prev_hash TEXT, -- Previous state hash
        current_hash TEXT, -- Current state hash
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- System Settings (Dynamic Thresholds)
    CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL, -- Values stored as strings for flexibility
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES profiles(id)
    );

    -- Technical Assistance (Intervention Tracking)
    CREATE TABLE IF NOT EXISTS technical_assistance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Optional if supporting a specific teacher
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- Optional if supporting a whole school or school head
        status TEXT NOT NULL CHECK (status IN ('Suggested', 'Offered', 'Completed', 'Cancelled')) DEFAULT 'Offered',
        support_type TEXT DEFAULT 'Instructional Guidance',
        notes TEXT, -- Private notes for the supervisor
        offered_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ─── 06. ROW LEVEL SECURITY (RLS) ───────────────────────────

    -- Enable RLS on all tables
    ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;
    ALTER TABLE teaching_loads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE technical_assistance ENABLE ROW LEVEL SECURITY;

    -- ─── RLS Policies ───

    -- 1. Profiles: Users view all, update own
    CREATE POLICY "Profiles viewable by authenticated" ON profiles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

    -- 2. Submissions: Managed by owner, viewable by hierarchy
    CREATE POLICY "Teachers manage own submissions" ON submissions FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Supervisors view all submissions" ON submissions FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor', 'School Head', 'Master Teacher'))
    );
    CREATE POLICY "Public verify by hash" ON submissions FOR SELECT USING (true); -- For QR verification page

    -- 3. Notifications: Private per user
    CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

    -- 4. Hierarchy & Academics: Viewable by all authenticated
    CREATE POLICY "Auth view hierarchy" ON divisions FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Auth view districts" ON districts FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Auth view schools" ON schools FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Auth view calendar" ON academic_calendar FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Auth view loads" ON teaching_loads FOR SELECT TO authenticated USING (true);

    -- 5. System Settings: All view, only Supervisors edit
    CREATE POLICY "Auth view settings" ON system_settings FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Supervisors manage settings" ON system_settings FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'District Supervisor')
    );

    -- 6. Technical Assistance: Supervisors manage, Teachers view own
    CREATE POLICY "Supervisors manage TA" ON technical_assistance FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('School Head', 'District Supervisor', 'Master Teacher'))
    );
    CREATE POLICY "Teachers view own TA" ON technical_assistance FOR SELECT USING (auth.uid() = teacher_id);

    -- ─── 07. PERFORMANCE INDEXES ────────────────────────────────

    CREATE INDEX IF NOT EXISTS idx_submissions_file_hash ON submissions(file_hash);
    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
