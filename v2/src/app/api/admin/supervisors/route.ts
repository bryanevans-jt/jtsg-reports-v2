import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SUPERADMIN_EMAIL } from '@/lib/constants';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role || role.role !== 'superadmin') {
    return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: roles } = await admin.from('user_roles').select('id, user_id, role');
  if (!roles?.length) return NextResponse.json([]);

  const result: { id: string; email: string; role: string }[] = [];
  for (const r of roles) {
    const { data: u } = await admin.auth.admin.getUserById(r.user_id);
    result.push({ id: r.id, email: u?.user?.email || 'unknown', role: r.role });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role || role.role !== 'superadmin') {
    return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email || !email.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Supervisors must have @thejoshuatree.org email' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.from('user_roles').upsert(
      { user_id: existing.id, role: 'supervisor' },
      { onConflict: 'user_id' }
    );
    return NextResponse.json({ success: true });
  }
  await admin.from('supervisor_invites').insert({ email: email.toLowerCase(), created_by: user.id });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!role || role.role !== 'superadmin') {
    return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin.from('user_roles').select('user_id, role').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.role === 'superadmin') {
    return NextResponse.json({ error: 'Cannot remove superadmin' }, { status: 400 });
  }
  const { data: targetUser } = await admin.auth.admin.getUserById(row.user_id);
  if (targetUser?.user?.email === user.email) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }
  await admin.from('user_roles').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
