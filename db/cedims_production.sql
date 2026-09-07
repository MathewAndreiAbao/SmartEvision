-- ═══════════════════════════════════════════════════════════════════════════════
-- Smart E-VISION (CEDIMS) — PRODUCTION DATABASE SCHEMA
-- Clean, verified, deployment-ready for 300 users · 200 daily uploads
--
-- Tables (17): divisions · districts · schools · profiles · academic_calendar
--   teaching_loads · curriculum_subjects · submissions · submission_reviews
--   dll_annotations · dll_reviews · dll_audit_logs · dll_file_versions
--   dll_export_templates · system_settings · notifications · audit_logs
--
-- Run top-to-bottom once in the Supabase SQL Editor.
-- Every statement is idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 1: HIERARCHY TABLES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS divisions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS districts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(division_id, name)
);

CREATE TABLE IF NOT EXISTS schools (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    address     TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(district_id, name)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 2: USERS
-- ══════════════════════════════════════════════════════════════════════════════

-- NOTE: 'Admin' is included — required by admin panel + audit_logs SELECT policy.
CREATE TABLE IF NOT EXISTS profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name         TEXT NOT NULL,
    email             TEXT,
    role              TEXT NOT NULL
        CHECK (role IN ('Teacher','School Head','Master Teacher','District Supervisor','Admin')),
    school_id         UUID REFERENCES schools(id),
    district_id       UUID REFERENCES districts(id),
    avatar_url        TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    push_subscription JSONB,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 3: ACADEMIC STRUCTURE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS academic_calendar (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id  UUID REFERENCES districts(id) ON DELETE CASCADE,
    school_year  TEXT NOT NULL,
    term         INTEGER NOT NULL CHECK (term BETWEEN 1 AND 3),
    week_number  INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 52),
    deadline_date TIMESTAMPTZ NOT NULL,
    description  TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(district_id, school_year, term, week_number)
);

CREATE TABLE IF NOT EXISTS teaching_loads (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    grade_level TEXT NOT NULL,
    subject     TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grade_level, subject)
);

-- Read-only MATATAG curriculum reference used by teaching load assignment UI
CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level TEXT NOT NULL
        CHECK (grade_level IN ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6')),
    subject     TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(grade_level, subject)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 4: SUBMISSIONS & REVIEW WORKFLOW
-- ══════════════════════════════════════════════════════════════════════════════

-- Canonical compliance_status values: compliant · late · missing · supplementary
CREATE TABLE IF NOT EXISTS submissions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    file_name         TEXT NOT NULL,
    file_path         TEXT NOT NULL,             -- B2 key: submissions/{userId}/{docType}/{ts}_{name}.pdf
    file_hash         TEXT NOT NULL,             -- SHA-256 of the stamped PDF (dedup key)
    file_size         INTEGER,
    doc_type          TEXT CHECK (doc_type IN ('DLL','ISP','ISR','Unknown')),
    week_number       INTEGER,
    subject           TEXT,
    school_year       TEXT,
    calendar_id       UUID REFERENCES academic_calendar(id),
    teaching_load_id  UUID REFERENCES teaching_loads(id) ON DELETE SET NULL,
    compliance_status TEXT DEFAULT 'compliant'
        CHECK (compliance_status IN ('compliant','late','missing','supplementary')),
    raw_text          TEXT,                      -- Tesseract OCR output for search
    ai_analysis       JSONB,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy reviewer comments (kept for backwards compat with existing data)
CREATE TABLE IF NOT EXISTS submission_reviews (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    reviewer_id   UUID REFERENCES profiles(id) NOT NULL,
    comment       TEXT,
    rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Digital annotations: highlight · comment · mark · flag
CREATE TABLE IF NOT EXISTS dll_annotations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id   UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    annotator_id    UUID REFERENCES profiles(id) NOT NULL,
    annotation_type TEXT NOT NULL
        CHECK (annotation_type IN ('highlight','comment','mark','flag')),
    content         TEXT NOT NULL,
    page_number     INTEGER,
    position        JSONB,
    color           TEXT DEFAULT '#FFFF00',
    is_official     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Approval workflow: submitted → needs-check → approved/returned
CREATE TABLE IF NOT EXISTS dll_reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id       UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    reviewer_id         UUID REFERENCES profiles(id) NOT NULL,
    status              TEXT NOT NULL DEFAULT 'needs-check'
        CHECK (status IN ('submitted','needs-check','returned','approved')),
    reviewer_comment    TEXT,
    return_reason       TEXT,
    approved_at         TIMESTAMPTZ,
    returned_at         TIMESTAMPTZ,
    file_hash_at_review TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id)
);

-- Immutable audit trail for each submission action
CREATE TABLE IF NOT EXISTS dll_audit_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id  UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    action         TEXT NOT NULL
        CHECK (action IN ('uploaded','annotated','reviewed','approved','returned','exported')),
    actor_id       UUID REFERENCES profiles(id) NOT NULL,
    actor_role     TEXT NOT NULL,
    details        JSONB,
    file_hash      TEXT,
    signature_hash TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- File revision tracking
CREATE TABLE IF NOT EXISTS dll_file_versions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id  UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    file_hash      TEXT NOT NULL UNIQUE,
    file_path      TEXT NOT NULL,
    file_size      INTEGER,
    uploaded_by    UUID REFERENCES profiles(id) NOT NULL,
    version_number INTEGER NOT NULL,
    reason         TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- DepEd reporting presets (used by Excel export feature)
CREATE TABLE IF NOT EXISTS dll_export_templates (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 TEXT NOT NULL UNIQUE,
    description          TEXT,
    format               TEXT CHECK (format IN ('pdf','csv','xlsx')),
    include_annotations  BOOLEAN DEFAULT TRUE,
    include_audit_trail  BOOLEAN DEFAULT TRUE,
    include_reviews      BOOLEAN DEFAULT TRUE,
    created_by           UUID REFERENCES profiles(id),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 5: SYSTEM
-- ══════════════════════════════════════════════════════════════════════════════

-- Key-value store: submission_window_days, maintenance_mode, enforce_ocr, max_upload_size_mb
-- Also stores VAPID push notification keys
CREATE TABLE IF NOT EXISTS system_settings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key         TEXT UNIQUE NOT NULL,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_by  UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT DEFAULT 'info'
        CHECK (type IN ('info','success','warning','error')),
    read       BOOLEAN DEFAULT FALSE,
    link       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- General admin audit trail (distinct from dll_audit_logs which is per-submission)
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID NOT NULL REFERENCES profiles(id),
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 6: INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- submissions — most-queried table
CREATE INDEX IF NOT EXISTS idx_submissions_file_hash          ON submissions(file_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_user_week_status   ON submissions(user_id, week_number, compliance_status);
CREATE INDEX IF NOT EXISTS idx_submissions_school_year_status ON submissions(school_year, compliance_status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at         ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_teaching_load      ON submissions(teaching_load_id);
CREATE INDEX IF NOT EXISTS idx_submissions_calendar           ON submissions(calendar_id);
-- Full-text search on OCR output
CREATE INDEX IF NOT EXISTS idx_submissions_raw_text
    ON submissions USING gin(to_tsvector('english', coalesce(raw_text, '')));

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school      ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_district    ON profiles(district_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_school ON profiles(role, school_id);

-- academic_calendar
CREATE INDEX IF NOT EXISTS idx_calendar_sy_week   ON academic_calendar(school_year, week_number);
CREATE INDEX IF NOT EXISTS idx_calendar_sy_active ON academic_calendar(school_year, term, is_active);

-- notifications — user inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, read, created_at DESC);

-- dll workflow tables
CREATE INDEX IF NOT EXISTS idx_dll_reviews_submission   ON dll_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_dll_reviews_reviewer     ON dll_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_dll_reviews_status       ON dll_reviews(status);
CREATE INDEX IF NOT EXISTS idx_dll_annotations_sub      ON dll_annotations(submission_id);
CREATE INDEX IF NOT EXISTS idx_dll_annotations_actor    ON dll_annotations(annotator_id);
CREATE INDEX IF NOT EXISTS idx_dll_audit_submission     ON dll_audit_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_dll_audit_actor          ON dll_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_dll_audit_created        ON dll_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_dll_versions_submission  ON dll_file_versions(submission_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 7: FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- Auto-create profile row when a new auth user signs up via Admin API
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, school_id, district_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Teacher'),
    CASE
      WHEN (NEW.raw_user_meta_data->>'school_id') IS NOT NULL
        AND (NEW.raw_user_meta_data->>'school_id') != ''
      THEN (NEW.raw_user_meta_data->>'school_id')::uuid
      ELSE NULL
    END,
    CASE
      WHEN (NEW.raw_user_meta_data->>'district_id') IS NOT NULL
        AND (NEW.raw_user_meta_data->>'district_id') != ''
      THEN (NEW.raw_user_meta_data->>'district_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update profiles.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 8: ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE divisions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_calendar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_loads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_subjects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dll_annotations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dll_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dll_audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dll_file_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dll_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- ── divisions ──
DROP POLICY IF EXISTS "divisions_read" ON divisions;
CREATE POLICY "divisions_read"
    ON divisions FOR SELECT TO authenticated USING (true);

-- ── districts ──
DROP POLICY IF EXISTS "districts_read" ON districts;
CREATE POLICY "districts_read"
    ON districts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "districts_supervisor_update" ON districts;
CREATE POLICY "districts_supervisor_update"
    ON districts FOR UPDATE TO authenticated
    USING (id = (SELECT district_id FROM profiles WHERE id = auth.uid() AND role = 'District Supervisor'))
    WITH CHECK (id = (SELECT district_id FROM profiles WHERE id = auth.uid() AND role = 'District Supervisor'));

-- ── schools ──
DROP POLICY IF EXISTS "schools_read" ON schools;
CREATE POLICY "schools_read"
    ON schools FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "schools_head_update" ON schools;
CREATE POLICY "schools_head_update"
    ON schools FOR UPDATE TO authenticated
    USING (id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'School Head'))
    WITH CHECK (id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'School Head'));

-- ── profiles ──
DROP POLICY IF EXISTS "profiles_read" ON profiles;
CREATE POLICY "profiles_read"
    ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update"
    ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_supervisor_update" ON profiles;
CREATE POLICY "profiles_supervisor_update"
    ON profiles FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('District Supervisor', 'Admin')
    ));

-- ── academic_calendar ──
DROP POLICY IF EXISTS "calendar_read" ON academic_calendar;
CREATE POLICY "calendar_read"
    ON academic_calendar FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "calendar_manage" ON academic_calendar;
CREATE POLICY "calendar_manage"
    ON academic_calendar FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles
                WHERE id = auth.uid()
                  AND role IN ('District Supervisor','School Head','Master Teacher'))
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('District Supervisor','School Head','Master Teacher')
              AND (
                (p.role = 'District Supervisor' AND p.district_id = academic_calendar.district_id)
                OR (p.role IN ('School Head','Master Teacher') AND p.school_id IN (
                    SELECT id FROM schools WHERE district_id = academic_calendar.district_id
                ))
              )
        )
    );

-- ── teaching_loads ──
DROP POLICY IF EXISTS "loads_self_manage" ON teaching_loads;
CREATE POLICY "loads_self_manage"
    ON teaching_loads FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "loads_school_read" ON teaching_loads;
CREATE POLICY "loads_school_read"
    ON teaching_loads FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles viewer
            JOIN profiles owner ON owner.id = teaching_loads.user_id
            WHERE viewer.id = auth.uid()
              AND viewer.role IN ('School Head','Master Teacher')
              AND viewer.school_id = owner.school_id
        )
    );

DROP POLICY IF EXISTS "loads_district_read" ON teaching_loads;
CREATE POLICY "loads_district_read"
    ON teaching_loads FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles viewer
            JOIN profiles owner ON owner.id = teaching_loads.user_id
            WHERE viewer.id = auth.uid()
              AND viewer.role IN ('District Supervisor','Admin')
              AND viewer.district_id = owner.district_id
        )
    );

-- ── curriculum_subjects (read-only reference) ──
DROP POLICY IF EXISTS "curriculum_read" ON curriculum_subjects;
CREATE POLICY "curriculum_read"
    ON curriculum_subjects FOR SELECT TO authenticated USING (true);

-- ── submissions ──
DROP POLICY IF EXISTS "submissions_self" ON submissions;
CREATE POLICY "submissions_self"
    ON submissions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "submissions_school_read" ON submissions;
CREATE POLICY "submissions_school_read"
    ON submissions FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles viewer
            JOIN profiles uploader ON uploader.id = submissions.user_id
            WHERE viewer.id = auth.uid()
              AND viewer.role IN ('School Head','Master Teacher')
              AND viewer.school_id = uploader.school_id
        )
    );

DROP POLICY IF EXISTS "submissions_district_read" ON submissions;
CREATE POLICY "submissions_district_read"
    ON submissions FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles
                WHERE id = auth.uid()
                  AND role IN ('District Supervisor','Admin'))
    );

-- Public hash-based verification (QR code scanner — no auth required)
DROP POLICY IF EXISTS "submissions_verify_public" ON submissions;
CREATE POLICY "submissions_verify_public"
    ON submissions FOR SELECT USING (true);

-- ── submission_reviews (legacy) ──
DROP POLICY IF EXISTS "reviews_create" ON submission_reviews;
CREATE POLICY "reviews_create"
    ON submission_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "reviews_read" ON submission_reviews;
CREATE POLICY "reviews_read"
    ON submission_reviews FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.id = submission_reviews.submission_id
              AND (s.user_id = auth.uid() OR submission_reviews.reviewer_id = auth.uid())
        )
    );

-- ── dll_annotations ──
DROP POLICY IF EXISTS "annotations_read" ON dll_annotations;
CREATE POLICY "annotations_read"
    ON dll_annotations FOR SELECT USING (
        auth.uid() = annotator_id
        OR EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM dll_reviews dr WHERE dr.submission_id = dll_annotations.submission_id AND dr.reviewer_id = auth.uid())
    );

DROP POLICY IF EXISTS "annotations_create" ON dll_annotations;
CREATE POLICY "annotations_create"
    ON dll_annotations FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = annotator_id);

DROP POLICY IF EXISTS "annotations_delete_own" ON dll_annotations;
CREATE POLICY "annotations_delete_own"
    ON dll_annotations FOR DELETE USING (auth.uid() = annotator_id AND is_official = FALSE);

-- ── dll_reviews ──
DROP POLICY IF EXISTS "dll_reviews_read" ON dll_reviews;
CREATE POLICY "dll_reviews_read"
    ON dll_reviews FOR SELECT USING (
        auth.uid() = reviewer_id
        OR EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor','School Head','Master Teacher'))
    );

DROP POLICY IF EXISTS "dll_reviews_manage" ON dll_reviews;
CREATE POLICY "dll_reviews_manage"
    ON dll_reviews FOR ALL TO authenticated
    USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- ── dll_audit_logs ──
DROP POLICY IF EXISTS "dll_audit_read" ON dll_audit_logs;
CREATE POLICY "dll_audit_read"
    ON dll_audit_logs FOR SELECT USING (
        auth.uid() = actor_id
        OR EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor','School Head','Master Teacher','Admin'))
    );

-- INSERT only via service role (server-side supabaseAdmin) — no client INSERT policy
-- Service role bypasses RLS entirely.

-- ── dll_file_versions ──
DROP POLICY IF EXISTS "dll_versions_read" ON dll_file_versions;
CREATE POLICY "dll_versions_read"
    ON dll_file_versions FOR SELECT USING (
        auth.uid() = uploaded_by
        OR EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor','School Head','Master Teacher'))
    );

-- ── dll_export_templates ──
DROP POLICY IF EXISTS "export_templates_read" ON dll_export_templates;
CREATE POLICY "export_templates_read"
    ON dll_export_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "export_templates_manage" ON dll_export_templates;
CREATE POLICY "export_templates_manage"
    ON dll_export_templates FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor','Admin')));

-- ── system_settings ──
DROP POLICY IF EXISTS "settings_read" ON system_settings;
CREATE POLICY "settings_read"
    ON system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_manage" ON system_settings;
CREATE POLICY "settings_manage"
    ON system_settings FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor','Admin')));

-- ── notifications ──
DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
CREATE POLICY "notifications_read_own"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- FIX: was WITH CHECK (true) — any user could spam any other user.
-- Client-side: users can only create notifications for themselves.
-- System notifications for other users MUST use supabaseAdmin (service role bypasses RLS).
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own"
    ON notifications FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ── audit_logs ──
DROP POLICY IF EXISTS "audit_logs_read" ON audit_logs;
CREATE POLICY "audit_logs_read"
    ON audit_logs FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('District Supervisor','Admin'))
    );

-- FIX: removed "any authenticated user can insert" policy.
-- All audit_logs inserts must go through server-side supabaseAdmin (service role).
-- Service role bypasses RLS — no client INSERT policy needed.

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 9: REALTIME
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 10: STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════════════════════════

-- NOTE: Files are stored in Backblaze B2, NOT Supabase Storage.
-- These buckets are only for avatar images (school logos, user avatars).
-- Document files (DLLs) are uploaded directly to B2 via pre-signed URLs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- User avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
    ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_upload" ON storage.objects;
CREATE POLICY "avatars_user_upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatars_school_upload" ON storage.objects;
CREATE POLICY "avatars_school_upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'schools'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role = 'School Head'
              AND school_id::text = (storage.foldername(name))[2]
        )
    );

DROP POLICY IF EXISTS "avatars_district_upload" ON storage.objects;
CREATE POLICY "avatars_district_upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'districts'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role = 'District Supervisor'
              AND district_id::text = (storage.foldername(name))[2]
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 11: SEED DATA
-- ══════════════════════════════════════════════════════════════════════════════

-- Division
INSERT INTO divisions (id, name) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'DepEd Calapan City')
ON CONFLICT (id) DO NOTHING;

-- District
INSERT INTO districts (id, division_id, name) VALUES
    ('d1000000-0000-0000-0000-000000000001',
     'd0000000-0000-0000-0000-000000000001',
     'Calapan East District')
ON CONFLICT (id) DO NOTHING;

-- Schools
INSERT INTO schools (id, district_id, name, address) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Bulusan Elementary School',     'Bulusan, Calapan City'),
    ('e0000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Guinobatan Elementary School',  'Guinobatan, Calapan City'),
    ('e0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'Ibaba Elementary School',       'Ibaba, Calapan City'),
    ('e0000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'Salong Elementary School',      'Salong, Calapan City'),
    ('e0000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'Suqui Elementary School',       'Suqui, Calapan City')
ON CONFLICT (id) DO NOTHING;

-- MATATAG Curriculum Grades 1–6
INSERT INTO curriculum_subjects (grade_level, subject, sort_order) VALUES
    ('Grade 1','Language',1),('Grade 1','Reading and Literacy',2),
    ('Grade 1','Mathematics',3),('Grade 1','GMRC',4),('Grade 1','Makabansa',5),
    ('Grade 2','Filipino',1),('Grade 2','English',2),
    ('Grade 2','Mathematics',3),('Grade 2','GMRC',4),('Grade 2','Makabansa',5),
    ('Grade 3','Filipino',1),('Grade 3','English',2),('Grade 3','Mathematics',3),
    ('Grade 3','Science',4),('Grade 3','GMRC',5),('Grade 3','Makabansa',6),
    ('Grade 4','Filipino',1),('Grade 4','English',2),('Grade 4','Mathematics',3),
    ('Grade 4','Science',4),('Grade 4','Araling Panlipunan',5),
    ('Grade 4','MAPEH',6),('Grade 4','GMRC',7),('Grade 4','EPP/TLE',8),
    ('Grade 5','Filipino',1),('Grade 5','English',2),('Grade 5','Mathematics',3),
    ('Grade 5','Science',4),('Grade 5','Araling Panlipunan',5),
    ('Grade 5','MAPEH',6),('Grade 5','GMRC',7),('Grade 5','EPP/TLE',8),
    ('Grade 6','Filipino',1),('Grade 6','English',2),('Grade 6','Mathematics',3),
    ('Grade 6','Science',4),('Grade 6','Araling Panlipunan',5),
    ('Grade 6','MAPEH',6),('Grade 6','GMRC',7),('Grade 6','EPP/TLE',8)
ON CONFLICT DO NOTHING;

-- Academic Calendar SY 2026-2027 (3 terms, 39 weeks, deadline every Friday 5PM PHT)
INSERT INTO academic_calendar (district_id, school_year, term, week_number, deadline_date, description) VALUES
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 1, '2026-06-12 17:00:00+08','Term 1 Week 1'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 2, '2026-06-19 17:00:00+08','Term 1 Week 2'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 3, '2026-06-26 17:00:00+08','Term 1 Week 3'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 4, '2026-07-03 17:00:00+08','Term 1 Week 4'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 5, '2026-07-10 17:00:00+08','Term 1 Week 5'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 6, '2026-07-17 17:00:00+08','Term 1 Week 6'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 7, '2026-07-24 17:00:00+08','Term 1 Week 7'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 8, '2026-07-31 17:00:00+08','Term 1 Week 8'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1, 9, '2026-08-07 17:00:00+08','Term 1 Week 9'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1,10, '2026-08-14 17:00:00+08','Term 1 Week 10'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1,11, '2026-08-21 17:00:00+08','Term 1 Week 11'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1,12, '2026-08-28 17:00:00+08','Term 1 Week 12'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',1,13, '2026-09-04 17:00:00+08','Term 1 Week 13'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,14, '2026-09-11 17:00:00+08','Term 2 Week 14'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,15, '2026-09-18 17:00:00+08','Term 2 Week 15'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,16, '2026-09-25 17:00:00+08','Term 2 Week 16'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,17, '2026-10-02 17:00:00+08','Term 2 Week 17'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,18, '2026-10-09 17:00:00+08','Term 2 Week 18'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,19, '2026-10-16 17:00:00+08','Term 2 Week 19'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,20, '2026-10-23 17:00:00+08','Term 2 Week 20'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,21, '2026-10-30 17:00:00+08','Term 2 Week 21'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,22, '2026-11-06 17:00:00+08','Term 2 Week 22'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,23, '2026-11-13 17:00:00+08','Term 2 Week 23'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,24, '2026-11-20 17:00:00+08','Term 2 Week 24'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,25, '2026-11-27 17:00:00+08','Term 2 Week 25'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',2,26, '2026-12-04 17:00:00+08','Term 2 Week 26'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,27, '2027-01-08 17:00:00+08','Term 3 Week 27'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,28, '2027-01-15 17:00:00+08','Term 3 Week 28'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,29, '2027-01-22 17:00:00+08','Term 3 Week 29'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,30, '2027-01-29 17:00:00+08','Term 3 Week 30'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,31, '2027-02-05 17:00:00+08','Term 3 Week 31'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,32, '2027-02-12 17:00:00+08','Term 3 Week 32'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,33, '2027-02-19 17:00:00+08','Term 3 Week 33'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,34, '2027-02-26 17:00:00+08','Term 3 Week 34'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,35, '2027-03-05 17:00:00+08','Term 3 Week 35'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,36, '2027-03-12 17:00:00+08','Term 3 Week 36'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,37, '2027-03-19 17:00:00+08','Term 3 Week 37'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,38, '2027-03-26 17:00:00+08','Term 3 Week 38'),
    ('d1000000-0000-0000-0000-000000000001','2026-2027',3,39, '2027-03-31 17:00:00+08','Term 3 Week 39 — End of School Year')
ON CONFLICT DO NOTHING;

-- Activate all seeded weeks immediately
UPDATE academic_calendar SET is_active = TRUE WHERE is_active = FALSE;

-- System settings (runtime config read by settings store)
INSERT INTO system_settings (key, value, description) VALUES
    ('submission_window_days', '5',    'Days after week-end deadline to still accept on-time submissions'),
    ('maintenance_mode',       'false','Disable all uploads for maintenance (true/false)'),
    ('enforce_ocr',            'true', 'Reject submissions where OCR metadata does not match'),
    ('max_upload_size_mb',     '25',   'Maximum file size in MB before pipeline rejects the file')
ON CONFLICT (key) DO NOTHING;

-- DLL export report presets
INSERT INTO dll_export_templates (id, name, description, format, include_annotations, include_audit_trail, include_reviews) VALUES
    ('f0000000-0000-0000-0000-000000000001','Complete DLL Report',  'Full report with annotations, reviews, audit trail', 'pdf',  TRUE,  TRUE,  TRUE),
    ('f0000000-0000-0000-0000-000000000002','Teacher Summary',      'Per-teacher submission summary',                     'pdf',  FALSE, FALSE, TRUE),
    ('f0000000-0000-0000-0000-000000000003','Compliance Report',    'Compliance data for spreadsheet analysis',           'csv',  FALSE, FALSE, FALSE),
    ('f0000000-0000-0000-0000-000000000004','Audit Trail Export',   'Complete audit trail for official documentation',    'xlsx', FALSE, TRUE,  FALSE)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 12: POST-DEPLOY STEPS (run manually after schema is applied)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Create first Admin user via Supabase Auth dashboard or /api/admin/create-user
-- 2. Set the Admin role:
--    UPDATE profiles SET role = 'Admin' WHERE email = 'admin@yourschool.edu.ph';

-- 3. Generate VAPID keys for push notifications (run once in Node.js):
--    const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys();
-- 4. Store VAPID keys:
--    INSERT INTO system_settings (key, value, description) VALUES
--      ('vapid_public_key',  '<your-public-key>',  'VAPID public key for Web Push'),
--      ('vapid_private_key', '<your-private-key>', 'VAPID private key for Web Push')
--    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. Verify all tables have data:
SELECT tbl, rows FROM (
    SELECT 'divisions'            AS tbl, count(*) AS rows FROM divisions            UNION ALL
    SELECT 'districts',                   count(*)          FROM districts            UNION ALL
    SELECT 'schools',                     count(*)          FROM schools              UNION ALL
    SELECT 'curriculum_subjects',         count(*)          FROM curriculum_subjects  UNION ALL
    SELECT 'academic_calendar',           count(*)          FROM academic_calendar    UNION ALL
    SELECT 'system_settings',             count(*)          FROM system_settings      UNION ALL
    SELECT 'dll_export_templates',        count(*)          FROM dll_export_templates UNION ALL
    SELECT 'profiles (empty until users signup)', count(*) FROM profiles
) t ORDER BY tbl;

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF PRODUCTION SCHEMA
-- ══════════════════════════════════════════════════════════════════════════════
