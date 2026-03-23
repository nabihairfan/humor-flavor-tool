"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Dashboard() {
  const router = useRouter()
  const [flavors, setFlavors] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark"
    setTheme(saved)
    applyTheme(saved)
    checkAndFetch()
  }, [])

  function applyTheme(t) {
    const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", isDark)
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    applyTheme(next)
  }

  async function checkAndFetch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/"); return }

    const allowedEmails = ["inabiha820@gmail.com"]
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin, is_matrix_admin")
      .eq("email", user.email)
      .single()

    if (!profile?.is_superadmin && !profile?.is_matrix_admin && !allowedEmails.includes(user.email)) {
      router.push("/"); return
    }

    fetchFlavors()
  }

  async function fetchFlavors() {
    const { data } = await supabase.from("humor_flavors").select("*").order("created_datetime_utc", { ascending: false })
    setFlavors(data || [])
    setLoading(false)
  }

  async function deleteFlavor(id) {
    if (!confirm("Delete this humor flavor?")) return
    await supabase.from("humor_flavors").delete().eq("id", id)
    fetchFlavors()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  const themeIcon = theme === "dark" ? "🌙 Dark" : theme === "light" ? "☀️ Light" : "💻 System"

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white animate-pulse text-xl">Loading...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-950 dark:bg-gray-950 bg-gray-100 p-8 transition-colors">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            😂 Humor Flavor Tool
          </h1>
          <p className="text-gray-400 mt-1">Manage humor flavors and prompt chains</p>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleTheme} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition">
            {themeIcon}
          </button>
          <button onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition">
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Humor Flavors</h2>
        <Link href="/flavors/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          + New Flavor
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {flavors.map((flavor) => (
          <div key={flavor.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">{flavor.slug}</h3>
              <p className="text-sm text-gray-400 mt-1">{flavor.description || "No description"}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Link href={`/flavors/${flavor.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm transition">
                🪜 Steps
              </Link>
              <Link href={`/flavors/${flavor.id}/captions`} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition">
                💬 Captions
              </Link>
              <Link href={`/flavors/${flavor.id}/test`} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition">
                🧪 Test
              </Link>
              <Link href={`/flavors/${flavor.id}/edit`} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm transition">
                ✏️ Edit
              </Link>
              <button onClick={() => deleteFlavor(flavor.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition">
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        {flavors.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-5xl mb-4">😶</p>
            <p className="text-gray-400 text-lg">No humor flavors yet. Create your first one!</p>
          </div>
        )}
      </div>
    </main>
  )
}