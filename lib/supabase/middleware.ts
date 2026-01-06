import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const protectedPaths = ['/contacts', '/journeys', '/messages', '/settings'];
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p));
  if (isProtected && !user) return NextResponse.redirect(new URL('/login', request.url));
  const authPaths = ['/login', '/signup'];
  const isAuth = authPaths.some(p => request.nextUrl.pathname.startsWith(p));
  if (isAuth && user) return NextResponse.redirect(new URL('/contacts', request.url));
  return response;
}
