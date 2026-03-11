-- When superadmin adds a supervisor by email, we either add to user_roles (if user exists)
-- or add to supervisor_invites. On first login, auth callback checks supervisor_invites and promotes.

CREATE TABLE IF NOT EXISTS supervisor_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE supervisor_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can manage supervisor_invites"
  ON supervisor_invites FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  );
