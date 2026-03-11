import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { SUPERADMIN_EMAIL, ORG_DOMAIN } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Ensure @thejoshuatree.org only
      const email = data.user.email || '';
      if (!email.endsWith(`@${ORG_DOMAIN}`)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=org_only`);
      }
      const admin = createAdminClient();
      if (email === SUPERADMIN_EMAIL) {
        await admin.from('user_roles').upsert(
          { user_id: data.user.id, role: 'superadmin' },
          { onConflict: 'user_id' }
        );
      } else {
        const { data: invite } = await admin.from('supervisor_invites').select('id').eq('email', email.toLowerCase()).single();
        if (invite) {
          await admin.from('user_roles').upsert(
            { user_id: data.user.id, role: 'supervisor' },
            { onConflict: 'user_id' }
          );
          await admin.from('supervisor_invites').delete().eq('id', invite.id);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
