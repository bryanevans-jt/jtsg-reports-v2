import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('admin_config').select('*').limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const cfg = data || {
    drive_folders: { se_monthly: '', vpr_default: '', vpr_by_stage: {}, jtsg_vmr: '', evf: '', jtsg_tsvs: '', signature_temp: '' },
    doc_templates: { se_monthly: '', vpr: '', jtsg_vmr: '', evf: '', jtsg_tsvs: '' },
    report_notification_recipients: [],
  };
  return NextResponse.json(cfg);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const body = await request.json();
  const admin = createAdminClient();
  const { data: existing } = await admin.from('admin_config').select('id').limit(1).single();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (body.drive_folders) updates.drive_folders = body.drive_folders;
  if (body.doc_templates) updates.doc_templates = body.doc_templates;
  if (Array.isArray(body.report_notification_recipients)) updates.report_notification_recipients = body.report_notification_recipients;

  const { error } = existing
    ? await admin.from('admin_config').update(updates).eq('id', existing.id)
    : await admin.from('admin_config').insert({ ...updates, id: crypto.randomUUID() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
