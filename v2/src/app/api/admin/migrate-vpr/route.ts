import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAuth } from '@/lib/google';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.endsWith('@thejoshuatree.org')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (!role || role.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });
    }

    const sheetId = process.env.VPR_MIGRATION_SHEET_ID;
    if (!sheetId) {
      return NextResponse.json(
        { error: 'VPR_MIGRATION_SHEET_ID not configured in environment' },
        { status: 400 }
      );
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A2:E',
    });

    const rows = (data.values as string[][]) || [];
    const toInsert: { date: string; client_name: string; service_stage: string; employment_specialist_name: string; notes: string; user_email: string }[] = [];

    for (const row of rows) {
      const [date, clientName, serviceStage, esName, notes] = row;
      if (!date || !clientName) continue;
      if (date < cutoffStr) continue;
      toInsert.push({
        date,
        client_name: clientName,
        service_stage: serviceStage || '',
        employment_specialist_name: esName || '',
        notes: notes || '',
        user_email: user.email,
      });
    }

    const admin = createAdminClient();
    if (toInsert.length > 0) {
      const { error } = await admin.from('vpr_submissions').insert(toInsert);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      migrated: toInsert.length,
      skipped: rows.length - toInsert.length,
    });
  } catch (e) {
    console.error('VPR migration error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Migration failed' },
      { status: 500 }
    );
  }
}
