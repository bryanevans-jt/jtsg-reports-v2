import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminPortal } from '@/components/admin/AdminPortal';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email?.endsWith('@thejoshuatree.org')) redirect('/login');

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const isAdmin = !!roleRow;
  const isSuperadmin = roleRow?.role === 'superadmin';
  if (!isAdmin) redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <AdminPortal
        userEmail={user.email!}
        isSuperadmin={isSuperadmin}
      />
    </div>
  );
}
