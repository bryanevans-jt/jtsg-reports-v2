import { Readable } from 'stream';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAuth, sendEmail } from '@/lib/google';
import { NextResponse } from 'next/server';

const FILE_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.endsWith('@thejoshuatree.org')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: config } = await admin.from('admin_config').select('doc_templates').limit(1).maybeSingle();
    const templates = (config?.doc_templates as Record<string, string>) || {};
    const stored = templates.jtsg_tsvs || '';

    let templateUrl: string | null = null;
    if (stored) {
      if (stored.startsWith('http')) {
        templateUrl = stored;
      } else if (stored.includes('/') || stored.endsWith('.pdf')) {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
        const path = stored.startsWith('templates/') ? stored : `templates/${stored}`;
        templateUrl = `${baseUrl}/storage/v1/object/public/${path}`;
      } else {
        templateUrl = `https://drive.google.com/uc?export=download&id=${stored}`;
      }
    }

    return NextResponse.json({ templateUrl });
  } catch (e) {
    console.error('JTSG TSVS template fetch error:', e);
    return NextResponse.json({ templateUrl: null });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.endsWith('@thejoshuatree.org')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const employmentSpecialistName = (formData.get('employmentSpecialistName') as string)?.trim() || '';
    const clientName = (formData.get('clientName') as string)?.trim() || '';
    const file = formData.get('file') as File | null;

    if (!clientName) return NextResponse.json({ error: 'Client name required' }, { status: 400 });
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Please attach a document (PDF, Word, or Excel)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
    if (!validExts.includes(ext)) {
      return NextResponse.json({ error: 'File must be PDF, Word (.doc/.docx), or Excel (.xls/.xlsx)' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: config } = await admin.from('admin_config').select('drive_folders').limit(1).maybeSingle();
    const folders = (config?.drive_folders as Record<string, string>) || {};
    const folderId = folders.jtsg_tsvs || '';
    if (!folderId) {
      return NextResponse.json(
        { error: 'JTSG Time Sheet Drive folder must be configured in Admin Portal.' },
        { status: 400 }
      );
    }

    const sanitize = (s: string) => s.replace(/[/\\:*?"<>|]/g, '-').trim() || 'Unknown';
    const baseName = `${sanitize(clientName)} - ${sanitize(employmentSpecialistName)} - JTSG Time Sheet`;
    const uploadFileName = `${baseName}.${ext}`;

    const auth = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const mimeType = FILE_MIME_MAP[ext] || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await drive.files.create({
      supportsAllDrives: true,
      requestBody: { name: uploadFileName, parents: [folderId] },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
    });

    const fileBase64 = buffer.toString('base64');
    await sendEmail(auth, {
      to: user.email,
      subject: `JTSG Time Sheet Submitted - ${clientName}`,
      text: `Hello ${employmentSpecialistName},\n\nYour JTSG Time Sheet for Vocational Services for ${clientName} has been submitted successfully. Your attached document is below for your records.\n\nThank you!`,
      attachments: [
        {
          filename: uploadFileName,
          content: fileBase64,
          encoding: 'base64' as const,
          mimeType,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Time sheet submitted successfully! You will receive a confirmation email with your document attached.',
    });
  } catch (e) {
    console.error('JTSG TSVS submission error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Submission failed' },
      { status: 500 }
    );
  }
}
