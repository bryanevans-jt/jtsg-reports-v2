import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ORG_DOMAIN = 'thejoshuatree.org';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/');
  const isLogin = request.nextUrl.pathname === '/login';
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  const isAdmin = request.nextUrl.pathname.startsWith('/admin');

  if (isAuthCallback || isApi) {
    return response;
  }

  if (!user) {
    if (isLogin) return response;
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }

  // Org check
  const email = user.email || '';
  if (!email.endsWith(`@${ORG_DOMAIN}`)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('error', 'org_only');
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
