"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewFlavor() {
  const router = useRouter()
  const [form, setForm] = useState({ slug: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!form.slug) { setError("Slug is required"); return }
    setSaving(true)
    const { error } = await supabase.from("humor_flavors").insert(form)
    if (error) { setError(error.message); setSaving(false); return }
    router.push("/dashboard")
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 mb-6 inline-block">← Back</Link>
      <h1 className="text-3xl font-black text-white mb-8">✨ New Humor Flavor</h1>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-2xl">
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="mb-6">
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Slug *</label>
          <input
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
            placeholder="e.g. sarcastic-humor"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        <div className="mb-6">
          <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 h-32"
            placeholder="Describe this humor flavor..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Flavor"}
          </button>
          <Link href="/dashboard" className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  )
}