import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'

/**
 * Rafraîchit le jeton Supabase et redirige de façon optimiste.
 *
 * Ce n'est PAS la barrière d'autorisation : chaque page et chaque Server Action
 * de l'espace admin revérifie la session via `requireUser()` (src/lib/dal.ts),
 * qui appelle `getUser()` et fait donc valider le jeton par Supabase.
 *
 * On utilise ici `getSession()` et non `getUser()` : `getUser()` interroge
 * Supabase à chaque requête (l'aller-retour coûtait plusieurs secondes sur une
 * connexion lente), alors que `getSession()` lit le cookie et ne sollicite le
 * réseau que lorsque le jeton doit réellement être rafraîchi. Faire confiance
 * au cookie serait dangereux pour autoriser un accès — ce n'est pas ce qu'on
 * fait : la décision fait au pire perdre un aller-retour à un visiteur muni
 * d'un cookie périmé, que `requireUser()` renverra vers la connexion.
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
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/admin'

  if (!isLoginPage && !session) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (isLoginPage && session) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return response
}

// Le site public n'a aucun besoin de session : le proxy ne tourne que sur
// l'espace d'administration, ce qui lui évite d'ajouter sa latence à chaque
// page vitrine et à chaque ressource statique.
export const config = {
  // `/admin` est listé séparément : la page de connexion doit elle aussi être
  // couverte, pour renvoyer vers le tableau de bord un visiteur déjà connecté.
  matcher: ['/admin', '/admin/:path*'],
}
