import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_superadmin, is_matrix_admin")
        .eq("email", user.email)
        .single()

      const allowedEmails = ["inabiha820@gmail.com"]
      if (!profile?.is_superadmin && !profile?.is_matrix_admin && !allowedEmails.includes(user.email)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${requestUrl.origin}/?error=unauthorized`)
      }
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}