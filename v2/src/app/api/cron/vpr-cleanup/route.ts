import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const valid = !cronSecret || authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret;
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vpr_submissions')
    .delete()
    .lt('date', cutoffStr)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: data?.length ?? 0 });
}
