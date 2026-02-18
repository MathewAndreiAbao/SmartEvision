-- ═══════════════════════════════════════════════════════════════
-- Smart E-VISION 2.0 — Complete Database Schema
-- Supabase PostgreSQL with Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── HIERARCHY ───────────────────────────────────────────────

-- Divisions (e.g., DepEd Calapan City)
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Districts within a Division (e.g., Calapan East)
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(division_id, name)
);

-- Schools within a District
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(district_id, name)
);

-- ─── USER PROFILES ──────────────────────────────────────────

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Teacher', 'School Head', 'Master Teacher', 'District Supervisor')),
    school_id UUID REFERENCES schools(id),
    district_id UUID REFERENCES districts(id),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- (Constraints removed to allow flexible onboarding/manual creation)
);

-- ─── ACADEMIC CALENDAR ──────────────────────────────────────

CREATE TABLE academic_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_year TEXT NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 52),
    deadline_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_year, quarter, week_number)
);

-- ─── TEACHING LOADS ─────────────────────────────────────────

CREATE TABLE teaching_loads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    grade_level TEXT NOT NULL,
    subject TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, grade_level, subject)
);

-- ─── SUBMISSIONS ────────────────────────────────────────────

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_size INTEGER,
    doc_type TEXT CHECK (doc_type IN ('DLL', 'ISP', 'ISR', 'Unknown')),
    status TEXT DEFAULT 'Compliant' CHECK (status IN ('Compliant', 'Late', 'Non-compliant', 'Under Review')),
    week_number INTEGER,
    subject TEXT,
    school_year TEXT,
    calendar_id UUID REFERENCES academic_calendar(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for hash lookups (verification)
CREATE INDEX idx_submissions_file_hash ON submissions(file_hash);

-- ─── SUBMISSION REVIEWS ─────────────────────────────────────

CREATE TABLE submission_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) NOT NULL,
    comment TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);


-- ─── Submissions ───
CREATE POLICY "Teachers can manage own submissions"
    ON submissions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "School heads can view school submissions"
    ON submissions FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles viewer
            JOIN profiles uploader ON uploader.id = submissions.user_id
            WHERE viewer.id = auth.uid()
            AND viewer.role IN ('School Head', 'Master Teacher')
            AND viewer.school_id = uploader.school_id
        )
    );

CREATE POLICY "Anyone can verify by hash"
    ON submissions FOR SELECT USING (true);

CREATE POLICY "Supervisors can view all submissions"
    ON submissions FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles viewer
            WHERE viewer.id = auth.uid()
            AND viewer.role = 'District Supervisor'
        )
    );

-- Public verification (by hash)
CREATE POLICY "Anyone can verify by hash"
    ON submissions FOR SELECT USING (true);

-- ─── Teaching Loads ───
CREATE POLICY "Teachers manage own loads"
    ON teaching_loads FOR ALL USING (auth.uid() = user_id);

-- ─── Read-only tables ───
CREATE POLICY "All authenticated users can view schools"
    ON schools FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can view districts"
    ON districts FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can view divisions"
    ON divisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can view calendar"
    ON academic_calendar FOR SELECT TO authenticated USING (true);

-- ─── Reviews ───
CREATE POLICY "Reviewers can create reviews"
    ON submission_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can view reviews on their submissions"
    ON submission_reviews FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.id = submission_reviews.submission_id
            AND (s.user_id = auth.uid() OR submission_reviews.reviewer_id = auth.uid())
        )
    );

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Calapan East District Pilot
-- ═══════════════════════════════════════════════════════════════

INSERT INTO divisions (id, name) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'DepEd Calapan City');

INSERT INTO districts (id, division_id, name) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Calapan East District');

INSERT INTO schools (id, district_id, name) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Bulusan Elementary School'),
    ('e0000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Guinobatan Elementary School'),
    ('e0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'Ibaba Elementary School'),
    ('e0000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'Salong Elementary School'),
    ('e0000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'Suqui Elementary School');

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKET & POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Note: Submissions are stored in 'submissions/{user_id}/{filename}'

-- 1. Allow uploader to insert their own files
CREATE POLICY "Users can upload own submissions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'submissions' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Allow uploader to view their own files
CREATE POLICY "Users can view own storage"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'submissions' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow supervisors to view all submissions
CREATE POLICY "Supervisors can view all storage"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'submissions' AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'District Supervisor'
    )
);

-- 4. Allow school heads to view their school's storage
CREATE POLICY "School heads can view school storage"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'submissions' AND 
    EXISTS (
        SELECT 1 FROM public.profiles viewer
        WHERE viewer.id = auth.uid()
        AND viewer.role IN ('School Head', 'Master Teacher')
        AND viewer.school_id = (
            SELECT school_id FROM public.profiles 
            WHERE id::text = (storage.foldername(storage.objects.name))[1]
        )
    )
);

-- 1. Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, school_id, district_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'Teacher'),
    CASE 
      WHEN (new.raw_user_meta_data->>'school_id') IS NOT NULL AND (new.raw_user_meta_data->>'school_id') != '' 
      THEN (new.raw_user_meta_data->>'school_id')::uuid 
      ELSE NULL 
    END,
    CASE 
      WHEN (new.raw_user_meta_data->>'district_id') IS NOT NULL AND (new.raw_user_meta_data->>'district_id') != '' 
      THEN (new.raw_user_meta_data->>'district_id')::uuid 
      ELSE NULL 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
