import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('monthly_se_reports')
    .select('*')
    .eq('client_id', clientId)
    .single();
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({});
  const { client_id, last_submitted, last_submitted_month, created_at, updated_at, ...raw } = data;
  const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const recall: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    recall[toCamel(k)] = v;
  }
  return NextResponse.json(recall);
}
