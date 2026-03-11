import { Readable } from 'stream';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAuth, sendEmail } from '@/lib/google';
import { generateSEMonthlyPdf } from '@/lib/pdf-generator';
import { generateClientId } from '@/lib/utils';
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
    const { data: config, error: configError } = await admin.from('admin_config').select('drive_folders, doc_templates').limit(1).maybeSingle();
    if (configError) throw new Error(`Config error: ${configError.message}`);
    const folders = (config?.drive_folders as Record<string, string>) || {};
    const templates = (config?.doc_templates as Record<string, string>) || {};
    const folderId = folders.se_monthly;
    const templateId = templates.se_monthly || process.env.SE_MONTHLY_TEMPLATE_ID;
    const sigFolderId = folders.signature_temp || folderId;
    if (!folderId || !templateId) {
      return NextResponse.json(
        { error: 'Drive folders and templates must be configured in Admin Portal before submitting reports.' },
        { status: 400 }
      );
    }

    const clientId = generateClientId(reportData.jobSeekerName as string);
    if (!clientId) return NextResponse.json({ error: 'Client name required' }, { status: 400 });

    const dataToSave = { ...reportData };
    if (Array.isArray(dataToSave.model)) dataToSave.model = (dataToSave.model as string[]).join(', ');
    const month = reportData.month as string;
    const lastSubmittedMonth = month ? `${month.slice(0, 4)}-${month.slice(5, 7)}` : null;

    await admin.from('monthly_se_reports').upsert(
      {
        client_id: clientId,
        job_seeker_name: reportData.jobSeekerName,
        se_specialist_name: reportData.seSpecialistName,
        se_provider_name: reportData.seProviderName,
        counselor_name: reportData.counselorName,
        employment_goal: reportData.employmentGoal,
        date_range_covers: reportData.dateRangeCovers,
        hours_of_coaching: reportData.hoursOfCoaching,
        model: dataToSave.model,
        medical_considerations: reportData.medicalConsiderations,
        behavioral_health_considerations: reportData.behavioralHealthConsiderations,
        sensory: reportData.sensory,
        assistive_technology: reportData.assistiveTechnology,
        release_of_information: reportData.releaseOfInformation,
        job_development: reportData.jobDevelopment,
        ongoing_supports: reportData.ongoingSupports,
        potential_barriers: reportData.potentialBarriers,
        extended_services: reportData.extendedServices,
        last_submitted: new Date().toISOString(),
        last_submitted_month: lastSubmittedMonth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    );

    const auth = await getGoogleAuth();
    const pdfBytes = await generateSEMonthlyPdf(auth, reportData, typedEsName || '', signatureData || '', {
      templateId,
      folderId,
      signatureFolderId: sigFolderId,
    });

    const drive = (await import('googleapis')).google.drive({ version: 'v3', auth });
    const fileName = `${reportData.jobSeekerName || 'Unknown Client'} - ${reportData.month || 'Date'} - SE Monthly Report.pdf`;
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
      subject: `Completed SE Monthly Report for ${reportData.jobSeekerName}`,
      text: `Hello ${reportData.seSpecialistName},\n\nYour completed report for ${reportData.jobSeekerName} is attached.\n\nThank you!`,
      attachments: [{ filename: fileName, content: pdfBytes.toString('base64'), encoding: 'base64' }],
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('SE Monthly submission error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Submission failed' },
      { status: 500 }
    );
  }
}
