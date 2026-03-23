"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [flavors, setFlavors] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    checkAndFetch()
    const saved = localStorage.getItem("theme") || "dark"
    setTheme(saved)
  }, [])

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

    setUser(user)
    fetchFlavors()
  }

  async function fetchFlavors() {
    const { data } = await supabase.from("humor_flavors").select("*").order("created_datetime_utc", { ascending: false })
    setFlavors(data || [])
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const bg = isDark ? "bg-gray-950" : "bg-gray-100"
  const card = isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
  const text = isDark ? "text-white" : "text-gray-900"
  const subtext = isDark ? "text-gray-400" : "text-gray-500"

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <p className={`${text} animate-pulse text-xl`}>Loading...</p>
    </div>
  )

  return (
    <main className={`min-h-screen ${bg} p-8`}>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className={`text-4xl font-black ${text} bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent`}>
            😂 Humor Flavor Tool
          </h1>
          <p className={subtext}>Manage humor flavors and prompt chains</p>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleTheme} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition">
            {theme === "dark" ? "🌙 Dark" : theme === "light" ? "☀️ Light" : "💻 System"}
          </button>
          <button onClick={signOut} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition">
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${text}`}>Humor Flavors</h2>
        <Link href="/flavors/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          + New Flavor
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {flavors.map((flavor) => (
          <div key={flavor.id} className={`border rounded-2xl p-6 ${card} flex justify-between items-center`}>
            <div>
              <h3 className={`text-lg font-bold ${text}`}>{flavor.slug}</h3>
              <p className={`text-sm ${subtext} mt-1`}>{flavor.description || "No description"}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/flavors/${flavor.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm transition">
                Manage Steps
              </Link>
              <Link href={`/flavors/${flavor.id}/test`} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition">
                Test
              </Link>
              <Link href={`/flavors/${flavor.id}/edit`} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm transition">
                Edit
              </Link>
              <DeleteFlavorButton id={flavor.id} onDelete={fetchFlavors} />
            </div>
          </div>
        ))}
        {flavors.length === 0 && (
          <div className={`border rounded-2xl p-12 ${card} text-center`}>
            <p className={`${subtext} text-lg`}>No humor flavors yet. Create your first one!</p>
          </div>
        )}
      </div>
    </main>
  )
}

function DeleteFlavorButton({ id, onDelete }) {
  async function handleDelete() {
    if (!confirm("Delete this humor flavor?")) return
    await supabase.from("humor_flavors").delete().eq("id", id)
    onDelete()
  }

  return (
    <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition">
      Delete
    </button>
  )
}