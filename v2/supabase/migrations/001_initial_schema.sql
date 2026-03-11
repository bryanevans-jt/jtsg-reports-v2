-- Joshua Tree Reports v2 - Initial Schema
-- Run this in Supabase SQL Editor or via supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADMIN CONFIG
-- ============================================

-- Single row config: Drive folders, templates, email recipients
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Drive folder IDs (one per report type; VPR has per-stage map)
  drive_folders JSONB NOT NULL DEFAULT '{
    "se_monthly": "",
    "vpr_default": "",
    "vpr_by_stage": {},
    "jtsg_vmr": "",
    "evf": "",
    "jtsg_tsvs": "",
    "signature_temp": ""
  }'::jsonb,
  -- Google Doc template IDs
  doc_templates JSONB NOT NULL DEFAULT '{
    "se_monthly": "",
    "vpr": "",
    "jtsg_vmr": "",
    "evf": ""
  }'::jsonb,
  -- Email recipients for Missing Reports List and Overdue Reports (array of emails)
  report_notification_recipients TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default config row (single row)
INSERT INTO admin_config (id) 
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM admin_config LIMIT 1);

-- ============================================
-- ROLES: Superadmin + Supervisors
-- ============================================

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'supervisor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Superadmin is immutable (bryan.evans@thejoshuatree.org) - added via trigger/seed
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- ============================================
-- VPR SUBMISSIONS (Progress Reports)
-- ============================================

CREATE TABLE vpr_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  client_name TEXT NOT NULL,
  service_stage TEXT NOT NULL,
  employment_specialist_name TEXT NOT NULL,
  notes TEXT,
  user_email TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vpr_submissions_date ON vpr_submissions(date);
CREATE INDEX idx_vpr_submissions_client ON vpr_submissions(client_name);
CREATE INDEX idx_vpr_submissions_service_stage ON vpr_submissions(service_stage);
CREATE INDEX idx_vpr_submissions_submitted_at ON vpr_submissions(submitted_at);

-- ============================================
-- MONTHLY SE REPORTS (GVRA) - for recall + overdue logic
-- ============================================

CREATE TABLE monthly_se_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL UNIQUE,  -- normalized: lowercased, no spaces
  job_seeker_name TEXT,
  se_specialist_name TEXT,
  se_provider_name TEXT,
  counselor_name TEXT,
  employment_goal TEXT,
  date_range_covers TEXT,
  hours_of_coaching TEXT,
  model TEXT,
  medical_considerations TEXT,
  behavioral_health_considerations TEXT,
  sensory TEXT,
  assistive_technology TEXT,
  release_of_information TEXT,
  job_development TEXT,
  ongoing_supports TEXT,
  potential_barriers TEXT,
  extended_services TEXT,
  last_submitted TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_submitted_month TEXT,  -- e.g. "2025-01" for recall matching
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monthly_se_reports_client_id ON monthly_se_reports(client_id);
CREATE INDEX idx_monthly_se_reports_last_submitted ON monthly_se_reports(last_submitted);

-- ============================================
-- REPORT JOBS (queue for PDF generation)
-- ============================================

CREATE TABLE report_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL CHECK (report_type IN ('seMonthly', 'vpr', 'jtsgvmr', 'evf', 'jtsgtsvs')),
  report_data JSONB NOT NULL,
  typed_es_name TEXT,
  signature_data TEXT,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_report_jobs_status ON report_jobs(status);
CREATE INDEX idx_report_jobs_created_at ON report_jobs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpr_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_se_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;

-- Helper: user has org email
CREATE OR REPLACE FUNCTION is_org_user()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'email')::TEXT LIKE '%@thejoshuatree.org';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: user is superadmin or supervisor
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('superadmin', 'supervisor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- admin_config: only admins can read/write
CREATE POLICY "Admins can manage admin_config"
  ON admin_config FOR ALL
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- user_roles: only superadmin can manage (add/remove supervisors)
CREATE POLICY "Superadmin can manage user_roles"
  ON user_roles FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- vpr_submissions: org users can insert; admins can read
CREATE POLICY "Org users can insert vpr"
  ON vpr_submissions FOR INSERT
  WITH CHECK (is_org_user());
CREATE POLICY "Admins can read vpr"
  ON vpr_submissions FOR SELECT
  USING (is_admin_user());

-- monthly_se_reports: org users can insert/update/select (for recall)
CREATE POLICY "Org users can manage monthly_se_reports"
  ON monthly_se_reports FOR ALL
  USING (is_org_user())
  WITH CHECK (is_org_user());

-- report_jobs: org users can insert; service role used for processing
CREATE POLICY "Org users can insert report_jobs"
  ON report_jobs FOR INSERT
  WITH CHECK (is_org_user());
CREATE POLICY "Org users can read own jobs"
  ON report_jobs FOR SELECT
  USING (is_org_user());
