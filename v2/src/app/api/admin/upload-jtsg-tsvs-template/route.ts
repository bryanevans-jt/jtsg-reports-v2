import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const BUCKET = 'templates';
const FILE_PATH = 'jtsg-tsvs-template.pdf';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.endsWith('@thejoshuatree.org')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (!role) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Please select a PDF file' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: bucketList } = await admin.storage.listBuckets();
    const bucketExists = bucketList?.some((b) => b.name === BUCKET);
    if (!bucketExists) {
      await admin.storage.createBucket(BUCKET, { public: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(FILE_PATH, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Template upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
    }

    const { data: config } = await admin.from('admin_config').select('id, doc_templates').limit(1).maybeSingle();
    const templates = (config?.doc_templates as Record<string, string>) || {};
    const updated = { ...templates, jtsg_tsvs: FILE_PATH };

    if (config?.id) {
      await admin.from('admin_config').update({
        doc_templates: updated,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }).eq('id', config.id);
    } else {
      await admin.from('admin_config').insert({
        id: crypto.randomUUID(),
        doc_templates: updated,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
    const templateUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${FILE_PATH}`;

    return NextResponse.json({ success: true, templateUrl });
  } catch (e) {
    console.error('JTSG TSVS template upload error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Upload failed' },
      { status: 500 }
    );
  }
}
