import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'

/**
 * Rafraîchit la session Supabase et redirige de façon optimiste.
 * Ce n'est PAS la barrière d'autorisation : chaque page et chaque Server Action
 * de l'espace admin revérifie la session via `requireUser()` (src/lib/dal.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/admin'
  const isAdminArea = pathname.startsWith('/admin')

  if (isAdminArea && !isLoginPage && !user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
