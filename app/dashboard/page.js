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

  const styles = {
    bg: isDark ? "bg-gray-950" : "bg-gray-100",
    card: isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200",
    text: isDark ? "text-white" : "text-gray-900",
    subtext: isDark ? "text-gray-400" : "text-gray-500",
    themeBtn: isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900",
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
    // Ask for a new unique slug
    const newSlug = prompt(`Enter a new unique slug for the duplicate of "${flavor.slug}":`, `${flavor.slug}-copy`)
    if (!newSlug || !newSlug.trim()) return
    const trimmedSlug = newSlug.trim()

    // Check slug is unique
    const { data: existing } = await supabase.from("humor_flavors").select("id").eq("slug", trimmedSlug).single()
    if (existing) {
      alert(`A flavor with slug "${trimmedSlug}" already exists. Please choose a different name.`)
      return
    }

    setDuplicating(flavor.id)

    try {
      // Step 1: Create the new flavor
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

      // Step 2: Fetch all steps for the original flavor
      const { data: steps, error: stepsError } = await supabase
        .from("humor_flavor_steps")
        .select("*")
        .eq("humor_flavor_id", flavor.id)
        .order("order_by", { ascending: true })

      if (stepsError) throw stepsError

      // Step 3: Insert copies of all steps pointing to the new flavor
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

      alert(`✅ Successfully duplicated "${flavor.slug}" as "${trimmedSlug}" with ${steps?.length || 0} steps!`)
      fetchFlavors()
    } catch (err) {
      console.error("Duplicate error:", err)
      alert(`❌ Something went wrong: ${err.message}`)
    }

    setDuplicating(null)
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
    <main className={`min-h-screen ${styles.bg} p-8 transition-colors duration-300`}>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            😂 Humor Flavor Tool
          </h1>
          <p className={`${styles.subtext} mt-1`}>Manage humor flavors and prompt chains</p>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleTheme} className={`${styles.themeBtn} px-4 py-2 rounded-lg text-sm transition`}>
            {themeIcon}
          </button>
          <button onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition">
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${styles.text}`}>Humor Flavors</h2>
        <Link href="/flavors/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          + New Flavor
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {flavors.map((flavor) => (
          <div key={flavor.id} className={`border rounded-2xl p-6 flex justify-between items-center ${styles.card}`}>
            <div>
              <h3 className={`text-lg font-bold ${styles.text}`}>{flavor.slug}</h3>
              <p className={`text-sm ${styles.subtext} mt-1`}>{flavor.description || "No description"}</p>
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
              <button
                onClick={() => duplicateFlavor(flavor)}
                disabled={duplicating === flavor.id}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                {duplicating === flavor.id ? "⏳ Duplicating..." : "📋 Duplicate"}
              </button>
              <button onClick={() => deleteFlavor(flavor.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition">
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        {flavors.length === 0 && (
          <div className={`border rounded-2xl p-12 text-center ${styles.card}`}>
            <p className="text-5xl mb-4">😶</p>
            <p className={`${styles.subtext} text-lg`}>No humor flavors yet. Create your first one!</p>
          </div>
        )}
      </div>
    </main>
  )
}