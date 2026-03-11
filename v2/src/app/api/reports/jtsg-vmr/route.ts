import { Readable } from 'stream';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAuth, sendEmail } from '@/lib/google';
import { generateJTSGVMRPdf } from '@/lib/pdf-generator';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.endsWith('@thejoshuatree.org')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportData, typedEsName, signatureData } = body;
    if (!reportData) return NextResponse.json({ error: 'reportData required' }, { status: 400 });

    const admin = createAdminClient();
    const { data: config } = await admin.from('admin_config').select('drive_folders, doc_templates').single();
    const folders = (config?.drive_folders as Record<string, string>) || {};
    const folderId = folders.jtsg_vmr;
    const templateId = (config?.doc_templates as Record<string, string>)?.jtsg_vmr || process.env.JTSG_VMR_TEMPLATE_ID;
    const sigFolderId = folders.signature_temp || folderId;
    if (!folderId || !templateId) {
      return NextResponse.json(
        { error: 'Drive folders and templates must be configured in Admin Portal before submitting reports.' },
        { status: 400 }
      );
    }

    const auth = await getGoogleAuth();
    const pdfBytes = await generateJTSGVMRPdf(auth, reportData, typedEsName || '', signatureData || '', {
      templateId,
      folderId,
      signatureFolderId: sigFolderId,
    });

    const drive = (await import('googleapis')).google.drive({ version: 'v3', auth });
    const fileName = `JTSG VMR - ${reportData.ClientName || 'Client'} - ${reportData.MonthofService || reportData.Month || 'Date'}.pdf`;
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
      subject: `Completed JTSG Vocational Monthly Report for ${reportData.ClientName}`,
      text: `Hello ${reportData.EmploymentSpecialistName || reportData.ESName},\n\nYour completed JTSG Vocational Monthly Report for ${reportData.ClientName} is attached.\n\nThank you!`,
      attachments: [{ filename: fileName, content: pdfBytes.toString('base64'), encoding: 'base64' }],
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('JTSG VMR submission error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Submission failed' },
      { status: 500 }
    );
  }
}
