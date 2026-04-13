import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/auth-helpers-nextjs"

const PROTECTED_PREFIXES = ["/search", "/workouts", "/progress", "/profile", "/chat", "/invite"]

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/auth"
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname === "/auth") {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/search"
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/auth",
    "/search/:path*",
    "/workouts/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/chat/:path*",
    "/invite/:path*",
  ],
}
