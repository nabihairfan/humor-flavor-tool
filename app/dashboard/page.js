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

export default function Dashboard() {
  const router = useRouter()
  const [flavors, setFlavors] = useState([])
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState(null)
  const [user, setUser] = useState(null)
  const { theme, toggleTheme, isDark } = useTheme()

  const s = {
    bg: isDark ? "bg-[#0a0a0f]" : "bg-gray-50",
    card: isDark ? "bg-[#111118] border-[#1e1e2e]" : "bg-white border-gray-200",
    text: isDark ? "text-white" : "text-gray-900",
    subtext: isDark ? "text-gray-500" : "text-gray-500",
    badge: isDark ? "bg-[#1e1e2e] text-gray-400 border border-[#2a2a3e]" : "bg-gray-100 text-gray-500 border border-gray-200",
    input: isDark ? "bg-[#1e1e2e] border-[#2a2a3e] text-white" : "bg-white border-gray-200 text-gray-900",
    themeBtn: isDark ? "bg-[#1e1e2e] hover:bg-[#2a2a3e] text-gray-400 border border-[#2a2a3e]" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200",
    divider: isDark ? "border-[#1e1e2e]" : "border-gray-100",
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
    if (existing) {
      alert(`A flavor with slug "${trimmedSlug}" already exists.`)
      return
    }

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

      alert(`✅ Duplicated as "${trimmedSlug}" with ${steps?.length || 0} steps`)
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

  const themeIcon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻"

  if (loading) return (
    <div className={`min-h-screen ${s.bg} flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading flavors...</p>
      </div>
    </div>
  )

  return (
    <main className={`min-h-screen ${s.bg} transition-colors duration-300`}>
      {/* Top nav bar */}
      <div className={`border-b ${s.divider} px-8 py-4 flex justify-between items-center sticky top-0 backdrop-blur-sm z-10 ${isDark ? "bg-[#0a0a0f]/80" : "bg-white/80"}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">H</div>
          <div>
            <h1 className={`text-sm font-bold ${s.text}`}>Humor Flavor Tool</h1>
            <p className="text-xs text-gray-500">prompt chain manager</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={toggleTheme} className={`${s.themeBtn} w-8 h-8 rounded-lg text-sm flex items-center justify-center transition`}>
            {themeIcon}
          </button>
          <button onClick={signOut} className="text-gray-500 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition border border-transparent hover:border-red-900">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Page header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className={`text-2xl font-black ${s.text} tracking-tight`}>Flavors</h2>
            <p className="text-gray-500 text-sm mt-1">{flavors.length} flavor{flavors.length !== 1 ? "s" : ""} configured</p>
          </div>
          <Link
            href="/flavors/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> New Flavor
          </Link>
        </div>

        {/* Flavor list */}
        <div className={`border rounded-xl overflow-hidden ${s.card}`}>
          {flavors.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-gray-600 text-sm">No flavors yet. Create your first one.</p>
            </div>
          ) : (
            flavors.map((flavor, i) => (
              <div
                key={flavor.id}
                className={`flex items-center justify-between px-6 py-4 ${i !== flavors.length - 1 ? `border-b ${s.divider}` : ""} ${isDark ? "hover:bg-[#16161f]" : "hover:bg-gray-50"} transition-colors group`}
              >
                {/* Left: flavor info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${isDark ? "bg-[#1e1e2e] text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                    {flavor.slug?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm ${s.text} font-mono`}>{flavor.slug}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{flavor.description || "No description"}</p>
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="flex gap-1.5 flex-shrink-0 ml-4">
                  <Link
                    href={`/flavors/${flavor.id}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-[#1e1e2e] hover:bg-indigo-600 text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-indigo-600" : "bg-gray-100 hover:bg-indigo-600 text-gray-600 hover:text-white border border-gray-200 hover:border-indigo-600"}`}
                  >
                    Steps
                  </Link>
                  <Link
                    href={`/flavors/${flavor.id}/captions`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-[#1e1e2e] hover:bg-purple-600 text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-purple-600" : "bg-gray-100 hover:bg-purple-600 text-gray-600 hover:text-white border border-gray-200 hover:border-purple-600"}`}
                  >
                    Captions
                  </Link>
                  <Link
                    href={`/flavors/${flavor.id}/test`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-[#1e1e2e] hover:bg-green-600 text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-green-600" : "bg-gray-100 hover:bg-green-600 text-gray-600 hover:text-white border border-gray-200 hover:border-green-600"}`}
                  >
                    Test
                  </Link>
                  <Link
                    href={`/flavors/${flavor.id}/edit`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-[#1e1e2e] hover:bg-yellow-600 text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-yellow-600" : "bg-gray-100 hover:bg-yellow-600 text-gray-600 hover:text-white border border-gray-200 hover:border-yellow-600"}`}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => duplicateFlavor(flavor)}
                    disabled={duplicating === flavor.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 ${isDark ? "bg-[#1e1e2e] hover:bg-cyan-600 text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-cyan-600" : "bg-gray-100 hover:bg-cyan-600 text-gray-600 hover:text-white border border-gray-200 hover:border-cyan-600"}`}
                  >
                    {duplicating === flavor.id ? "Copying..." : "Duplicate"}
                  </button>
                  <button
                    onClick={() => deleteFlavor(flavor.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-[#1e1e2e] hover:bg-red-600 text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-red-600" : "bg-gray-100 hover:bg-red-600 text-gray-600 hover:text-white border border-gray-200 hover:border-red-600"}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-center text-gray-700 text-xs mt-8">Humor Flavor Tool • Internal use only</p>
      </div>
    </main>
  )
}