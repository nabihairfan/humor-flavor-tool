"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

export default function ManageSteps() {
  const router = useRouter()
  const { id } = useParams()
  const [flavor, setFlavor] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    description: "",
    llm_system_prompt: "",
    llm_user_prompt: "",
    llm_temperature: "0.7",
    order_by: "1"
  })

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const [{ data: flavorData }, { data: stepsData }] = await Promise.all([
      supabase.from("humor_flavors").select("*").eq("id", id).single(),
      supabase.from("humor_flavor_steps").select("*").eq("humor_flavor_id", id).order("order_by", { ascending: true })
    ])
    setFlavor(flavorData)
    setSteps(stepsData || [])
    setLoading(false)
  }

  async function handleSubmit() {
    const payload = {
      ...form,
      humor_flavor_id: id,
      llm_temperature: parseFloat(form.llm_temperature),
      order_by: parseInt(form.order_by)
    }
    if (editing) {
      await supabase.from("humor_flavor_steps").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("humor_flavor_steps").insert(payload)
    }
    setShowForm(false)
    setEditing(null)
    setForm({ description: "", llm_system_prompt: "", llm_user_prompt: "", llm_temperature: "0.7", order_by: "1" })
    fetchAll()
  }

  async function handleDelete(stepId) {
    if (!confirm("Delete this step?")) return
    await supabase.from("humor_flavor_steps").delete().eq("id", stepId)
    fetchAll()
  }

  function handleEdit(step) {
    setEditing(step)
    setForm({
      description: step.description || "",
      llm_system_prompt: step.llm_system_prompt || "",
      llm_user_prompt: step.llm_user_prompt || "",
      llm_temperature: String(step.llm_temperature || "0.7"),
      order_by: String(step.order_by || "1")
    })
    setShowForm(true)
  }

  async function moveStep(stepId, direction) {
    const index = steps.findIndex(s => s.id === stepId)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= steps.length) return

    const step1 = steps[index]
    const step2 = steps[swapIndex]

    await Promise.all([
      supabase.from("humor_flavor_steps").update({ order_by: step2.order_by }).eq("id", step1.id),
      supabase.from("humor_flavor_steps").update({ order_by: step1.order_by }).eq("id", step2.id)
    ])
    fetchAll()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white animate-pulse text-xl">Loading...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 mb-6 inline-block">← Back to Dashboard</Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">🪜 {flavor?.slug}</h1>
          <p className="text-gray-400 mt-1">{flavor?.description || "No description"}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/flavors/${id}/test`} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            🧪 Test Flavor
          </Link>
          <button
            onClick={() => { setShowForm(true); setEditing(null); setForm({ description: "", llm_system_prompt: "", llm_user_prompt: "", llm_temperature: "0.7", order_by: String(steps.length + 1) }) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Add Step
          </button>
        </div>
      </div>

      {/* Step Form */}
      {showForm && (
        <div className="bg-gray-900 border border-indigo-500 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-bold text-lg mb-4">{editing ? "✏️ Edit Step" : "✨ New Step"}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-gray-400 text-xs uppercase mb-1 block">Order</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                value={form.order_by}
                onChange={(e) => setForm({ ...form, order_by: e.target.value })}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase mb-1 block">Temperature (0-2)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                value={form.llm_temperature}
                onChange={(e) => setForm({ ...form, llm_temperature: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-gray-400 text-xs uppercase mb-1 block">Description</label>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="What does this step do?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="text-gray-400 text-xs uppercase mb-1 block">System Prompt</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 h-28"
              placeholder="You are a helpful assistant..."
              value={form.llm_system_prompt}
              onChange={(e) => setForm({ ...form, llm_system_prompt: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="text-gray-400 text-xs uppercase mb-1 block">User Prompt</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 h-28"
              placeholder="Describe the image..."
              value={form.llm_user_prompt}
              onChange={(e) => setForm({ ...form, llm_user_prompt: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save Step</button>
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-lg">
                  {step.order_by}
                </div>
                <div>
                  <h3 className="text-white font-bold">{step.description || "No description"}</h3>
                  <p className="text-gray-400 text-xs mt-1">Temperature: {step.llm_temperature}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => moveStep(step.id, "up")} disabled={index === 0} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm disabled:opacity-30">↑</button>
                <button onClick={() => moveStep(step.id, "down")} disabled={index === steps.length - 1} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm disabled:opacity-30">↓</button>
                <button onClick={() => handleEdit(step)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm">Edit</button>
                <button onClick={() => handleDelete(step.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Delete</button>
              </div>
            </div>
            {step.llm_system_prompt && (
              <div className="mt-4 bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs uppercase mb-1">System Prompt</p>
                <p className="text-gray-300 text-sm">{step.llm_system_prompt}</p>
              </div>
            )}
            {step.llm_user_prompt && (
              <div className="mt-2 bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs uppercase mb-1">User Prompt</p>
                <p className="text-gray-300 text-sm">{step.llm_user_prompt}</p>
              </div>
            )}
          </div>
        ))}
        {steps.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-gray-400 text-lg">No steps yet. Add your first step!</p>
          </div>
        )}
      </div>
    </main>
  )
}