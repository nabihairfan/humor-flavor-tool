"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

function useTheme() {
  const [theme, setTheme] = useState("dark")
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark"
    setTheme(saved)
  }, [])
  function toggleTheme() {
    const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
  }
  const systemDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = theme === "dark" || (theme === "system" && systemDark)
  return { theme, toggleTheme, isDark }
}

const FLAVOR_COLORS = [
  { bg: "from-pink-500 to-rose-500", light: "bg-pink-50 text-pink-700 border-pink-200", dark: "bg-pink-950 text-pink-300 border-pink-800" },
  { bg: "from-violet-500 to-purple-500", light: "bg-violet-50 text-violet-700 border-violet-200", dark: "bg-violet-950 text-violet-300 border-violet-800" },
  { bg: "from-blue-500 to-cyan-500", light: "bg-blue-50 text-blue-700 border-blue-200", dark: "bg-blue-950 text-blue-300 border-blue-800" },
  { bg: "from-emerald-500 to-teal-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200", dark: "bg-emerald-950 text-emerald-300 border-emerald-800" },
  { bg: "from-orange-500 to-amber-500", light: "bg-orange-50 text-orange-700 border-orange-200", dark: "bg-orange-950 text-orange-300 border-orange-800" },
  { bg: "from-fuchsia-500 to-pink-500", light: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", dark: "bg-fuchsia-950 text-fuchsia-300 border-fuchsia-800" },
]

export default function Dashboard() {
  const router = useRouter()
  const [flavors, setFlavors] = useState([])
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState(null)
  const [user, setUser] = useState(null)
  const { theme, toggleTheme, isDark } = useTheme()

  const s = {
    bg: isDark ? "bg-gray-950" : "bg-gradient-to-br from-violet-50 via-pink-50 to-orange-50",
    text: isDark ? "text-white" : "text-gray-900",
    subtext: isDark ? "text-gray-400" : "text-gray-500",
    card: isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100",
  }

  useEffect(() => { checkAndFetch() }, [])

  async function checkAndFetch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/"); return }
    setUser(user)
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

  async function duplicateFlavor(flavor) {
    const newSlug = prompt(`New slug for duplicate of "${flavor.slug}":`, `${flavor.slug}-copy`)
    if (!newSlug || !newSlug.trim()) return
    const trimmedSlug = newSlug.trim()
    const { data: existing } = await supabase.from("humor_flavors").select("id").eq("slug", trimmedSlug).single()
    if (existing) { alert(`A flavor with slug "${trimmedSlug}" already exists.`); return }
    setDuplicating(flavor.id)
    try {
      const { data: newFlavor, error: flavorError } = await supabase
        .from("humor_flavors")
        .insert({
          slug: trimmedSlug,
          description: flavor.description ? `Copy of ${flavor.description}` : `Copy of ${flavor.slug}`,
          is_pinned: false,
          created_by_user_id: user.id,
          modified_by_user_id: user.id,
        })
        .select()
        .single()
      if (flavorError) throw flavorError
      const { data: steps, error: stepsError } = await supabase
        .from("humor_flavor_steps")
        .select("*")
        .eq("humor_flavor_id", flavor.id)
        .order("order_by", { ascending: true })
      if (stepsError) throw stepsError
      if (steps && steps.length > 0) {
        const newSteps = steps.map(step => ({
          humor_flavor_id: newFlavor.id,
          llm_temperature: step.llm_temperature,
          order_by: step.order_by,
          llm_input_type_id: step.llm_input_type_id,
          llm_output_type_id: step.llm_output_type_id,
          llm_model_id: step.llm_model_id,
          humor_flavor_step_type_id: step.humor_flavor_step_type_id,
          llm_system_prompt: step.llm_system_prompt,
          llm_user_prompt: step.llm_user_prompt,
          description: step.description,
          created_by_user_id: user.id,
          modified_by_user_id: user.id,
        }))
        const { error: insertError } = await supabase.from("humor_flavor_steps").insert(newSteps)
        if (insertError) throw insertError
      }
      alert(`✅ Duplicated as "${trimmedSlug}" with ${steps?.length || 0} steps!`)
      fetchFlavors()
    } catch (err) {
      console.error("Duplicate error:", err)
      alert(`❌ Error: ${err.message}`)
    }
    setDuplicating(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  const themeIcon = theme === "dark" ? "🌙 Dark" : theme === "light" ? "☀️ Light" : "💻 System"

  if (loading) return (
    <div className={`min-h-screen ${s.bg} flex items-center justify-center`}>
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🎭</div>
        <p className="text-gray-500 animate-pulse text-sm font-medium">Loading flavors...</p>
      </div>
    </div>
  )

  return (
    <main className={`min-h-screen ${s.bg} p-8 transition-colors duration-300`}>

      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xl shadow-lg shadow-violet-200">
                🎭
              </div>
              <h1 className={`text-3xl font-black tracking-tight ${s.text}`}>
                Humor Flavor Tool
              </h1>
            </div>
            <p className={`${s.subtext} text-sm ml-13 pl-1`}>Manage prompt chains and humor styles</p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className={`px-3 py-2 rounded-xl text-sm font-medium transition border ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"} shadow-sm`}>
              {themeIcon}
            </button>
            <button onClick={signOut} className="px-3 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition shadow-sm">
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Flavors", value: flavors.length, emoji: "🎨", color: "from-violet-500 to-purple-600" },
            { label: "With Steps", value: flavors.filter(f => f.id).length, emoji: "🪜", color: "from-blue-500 to-cyan-500" },
            { label: "Ready to Test", value: flavors.length, emoji: "🧪", color: "from-emerald-500 to-teal-500" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="text-white/70 text-xs mt-1 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Flavor list header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg font-bold ${s.text}`}>All Flavors</h2>
          <Link
            href="/flavors/new"
            className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-violet-200 flex items-center gap-2"
          >
            <span className="text-base">+</span> New Flavor
          </Link>
        </div>

        {/* Flavor cards */}
        <div className="grid grid-cols-1 gap-3">
          {flavors.length === 0 ? (
            <div className={`border-2 border-dashed rounded-2xl p-16 text-center ${isDark ? "border-gray-800" : "border-gray-200"}`}>
              <p className="text-5xl mb-4">🎭</p>
              <p className={`${s.subtext} text-lg font-medium`}>No flavors yet</p>
              <p className={`${s.subtext} text-sm mt-1`}>Create your first humor flavor to get started</p>
            </div>
          ) : (
            flavors.map((flavor, i) => {
              const color = FLAVOR_COLORS[i % FLAVOR_COLORS.length]
              const colorTag = isDark ? color.dark : color.light
              return (
                <div key={flavor.id} className={`border rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm transition-all hover:shadow-md ${s.card}`}>
                  {/* Left */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center text-white font-black text-xs shadow-md flex-shrink-0`}>
                      {flavor.slug?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-bold text-sm ${s.text}`}>{flavor.slug}</p>
                        {flavor.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">📌 Pinned</span>}
                      </div>
                      <p className={`text-xs mt-0.5 truncate max-w-md ${s.subtext}`}>{flavor.description || "No description"}</p>
                    </div>
                  </div>

                  {/* Right: buttons */}
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <Link href={`/flavors/${flavor.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white transition border border-indigo-200 hover:border-indigo-600">
                      🪜 Steps
                    </Link>
                    <Link href={`/flavors/${flavor.id}/captions`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white transition border border-purple-200 hover:border-purple-600">
                      💬 Captions
                    </Link>
                    <Link href={`/flavors/${flavor.id}/test`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white transition border border-emerald-200 hover:border-emerald-600">
                      🧪 Test
                    </Link>
                    <Link href={`/flavors/${flavor.id}/edit`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white transition border border-amber-200 hover:border-amber-600">
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => duplicateFlavor(flavor)}
                      disabled={duplicating === flavor.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-100 text-cyan-700 hover:bg-cyan-600 hover:text-white transition border border-cyan-200 hover:border-cyan-600 disabled:opacity-40">
                      {duplicating === flavor.id ? "⏳" : "📋 Duplicate"}
                    </button>
                    <button
                      onClick={() => deleteFlavor(flavor.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition border border-red-200 hover:border-red-600">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <p className={`text-center text-xs mt-10 ${s.subtext}`}>Humor Flavor Tool • Internal use only 🎭</p>
      </div>
    </main>
  )
}