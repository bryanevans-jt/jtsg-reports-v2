import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center text-green-800">
          Joshua Tree Reports
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Welcome, {user.user_metadata?.full_name || user.email}! Use this tool to submit client
          reports.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/reports"
            className="block w-full py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300 text-center"
          >
            Submit Reports
          </Link>
          <Link
            href="/admin"
            className="block w-full py-3 px-4 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition duration-300 text-center"
          >
            Admin Portal
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
