import { Readable } from 'stream';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAuth, sendEmail } from '@/lib/google';
import { generateEVFPdf } from '@/lib/pdf-generator';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.endsWith('@thejoshuatree.org')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const reportData = body.reportData as Record<string, string>;
    if (!reportData) return NextResponse.json({ error: 'reportData required' }, { status: 400 });

    const admin = createAdminClient();
    const { data: config } = await admin.from('admin_config').select('drive_folders, doc_templates').single();
    const folders = (config?.drive_folders as Record<string, string>) || {};
    const folderId = folders.evf;
    const templateId = (config?.doc_templates as Record<string, string>)?.evf || process.env.EVF_TEMPLATE_ID;
    if (!folderId || !templateId) {
      return NextResponse.json(
        { error: 'Drive folders and templates must be configured in Admin Portal before submitting reports.' },
        { status: 400 }
      );
    }

    const auth = await getGoogleAuth();
    const pdfBytes = await generateEVFPdf(auth, reportData, { templateId, folderId });

    const drive = (await import('googleapis')).google.drive({ version: 'v3', auth });
    const fileName = `EVF - ${reportData.Name || 'Client'} - ${reportData.Date}.pdf`;
    await drive.files.create({
      supportsAllDrives: true,
      requestBody: { name: fileName, parents: [folderId] },
      media: {
        mimeType: 'application/pdf',
        body: Readable.from(pdfBytes),
      },
    });

    await sendEmail(auth, {
      to: user.email,
      subject: `Completed Employment Verification Form for ${reportData.Name}`,
      text: `Hello,\n\nYour completed Employment Verification Form for ${reportData.Name} is attached.\n\nThank you!`,
      attachments: [{ filename: fileName, content: pdfBytes.toString('base64'), encoding: 'base64' }],
    });

    return NextResponse.json({
      success: true,
      message: 'Form submitted! You will receive an email with the final PDF shortly.',
    });
  } catch (e) {
    console.error('EVF submission error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Submission failed' },
      { status: 500 }
    );
  }
}
