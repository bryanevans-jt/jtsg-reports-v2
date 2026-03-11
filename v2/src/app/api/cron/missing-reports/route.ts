import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAuth, sendEmail } from '@/lib/google';
import { SUPPORTED_EMPLOYMENT_STAGES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const valid = !cronSecret || authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret;
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const prevMonthStart = new Date(prevYear, prevMonth, 1);
  const prevMonthEnd = new Date(prevYear, prevMonth + 1, 0);

  const admin = createAdminClient();
  const { data: config } = await admin.from('admin_config').select('report_notification_recipients').single();
  const recipients = (config?.report_notification_recipients as string[]) || [];
  if (recipients.length === 0) {
    return NextResponse.json({ message: 'No recipients configured' });
  }

  const vprStart = prevMonthStart.toISOString().slice(0, 10);
  const vprEnd = prevMonthEnd.toISOString().slice(0, 10);

  const { data: vprs } = await admin
    .from('vpr_submissions')
    .select('client_name, service_stage, employment_specialist_name')
    .gte('date', vprStart)
    .lte('date', vprEnd)
    .in('service_stage', [...SUPPORTED_EMPLOYMENT_STAGES]);

  const clientKeys = new Set<string>();
  const byClient = new Map<string, { specialist: string; stage: string }>();
  for (const v of vprs || []) {
    const key = `${(v.employment_specialist_name || '').toLowerCase()}|${(v.client_name || '').toLowerCase()}`;
    if (clientKeys.has(key)) continue;
    clientKeys.add(key);
    byClient.set(key, {
      specialist: v.employment_specialist_name || 'Unknown',
      stage: v.service_stage || 'Unknown',
    });
  }

  const prevMonthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  const prevPrevMonth = prevMonth === 0 ? 11 : prevMonth - 1;
  const prevPrevYear = prevMonth === 0 ? prevYear - 1 : prevYear;
  const prevPrevMonthStr = `${prevPrevYear}-${String(prevPrevMonth + 1).padStart(2, '0')}`;

  const { data: gvras } = await admin
    .from('monthly_se_reports')
    .select('client_id, job_seeker_name, se_specialist_name, last_submitted_month')
    .in('last_submitted_month', [prevMonthStr, prevPrevMonthStr]);

  const submittedPrevMonth = new Set(
    (gvras || []).filter((r) => r.last_submitted_month === prevMonthStr).map((r) => (r.client_id || '').toLowerCase().replace(/\s/g, ''))
  );
  const submittedTwoMonthsAgo = new Set(
    (gvras || []).filter((r) => r.last_submitted_month === prevPrevMonthStr).map((r) => (r.client_id || '').toLowerCase().replace(/\s/g, ''))
  );

  const missing: { specialist: string; client: string; stage: string }[] = [];
  for (const v of vprs || []) {
    const clientId = (v.client_name || '').toLowerCase().replace(/\s/g, '');
    if (submittedPrevMonth.has(clientId)) continue;
    if (!submittedTwoMonthsAgo.has(clientId)) continue;
    const key = `${(v.employment_specialist_name || '').toLowerCase()}|${(v.client_name || '').toLowerCase()}`;
    const info = byClient.get(key);
    if (info) {
      missing.push({
        specialist: info.specialist,
        client: v.client_name || 'Unknown',
        stage: info.stage,
      });
    }
  }

  const deduped = Array.from(new Map(missing.map((m) => [`${m.specialist}|${m.client}`, m])).values());

  if (deduped.length === 0) {
    return NextResponse.json({ message: 'No missing reports' });
  }

  const emailBody =
    'The following GVRA Monthly Reports are not yet submitted (deadline: 10th at 5:00pm):\n\n' +
    deduped.map((m) => ` - ${m.specialist} - ${m.client} - ${m.stage}`).join('\n');

  const auth = await getGoogleAuth();
  for (const to of recipients) {
    await sendEmail(auth, {
      to,
      subject: 'Missing Reports List',
      text: emailBody,
    });
  }

  return NextResponse.json({ sent: recipients.length, count: deduped.length });
}
