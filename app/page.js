"use client"
import { supabase } from "@/lib/supabase"

export default function Home() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
      <div className="bg-gray-900 border border-gray-700 p-10 rounded-2xl shadow-2xl text-center">
        <h1 className="text-3xl font-black text-white mb-2">😂 Humor Flavor Tool</h1>
        <p className="text-gray-400 mb-8">Superadmins & Matrix Admins only</p>
        <button
          onClick={signInWithGoogle}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold transition"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  )
}