"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import Link from "next/link"

export default function TestFlavor() {
  const { id } = useParams()
  const [flavor, setFlavor] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [captions, setCaptions] = useState([])
  const [error, setError] = useState("")
  const [step, setStep] = useState("")

  useEffect(() => {
    supabase.from("humor_flavors").select("*").eq("id", id).single().then(({ data }) => setFlavor(data))
  }, [id])

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setCaptions([])
    setError("")
  }

  async function handleTest() {
    if (!file) { setError("Please select an image first"); return }
    setLoading(true)
    setCaptions([])
    setError("")

    try {
      // Get JWT token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error("Not logged in")

      // Step 1: Get presigned URL
      setStep("Getting upload URL...")
      const presignRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-presigned-url", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type })
      })
      const { presignedUrl, cdnUrl } = await presignRes.json()

      // Step 2: Upload image
      setStep("Uploading image...")
      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      })

      // Step 3: Register image
      setStep("Registering image...")
      const registerRes = await fetch("https://api.almostcrackd.ai/pipeline/upload-image-from-url", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      })
      const { imageId } = await registerRes.json()

      // Step 4: Generate captions
      setStep("Generating captions...")
      const captionRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-captions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, humorFlavorId: id })
      })
      const captionData = await captionRes.json()
      setCaptions(Array.isArray(captionData) ? captionData : [captionData])
      setStep("")
    } catch (err) {
      setError(err.message || "Something went wrong")
      setStep("")
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <Link href={`/flavors/${id}`} className="text-indigo-400 hover:text-indigo-300 mb-6 inline-block">← Back to Steps</Link>
      <h1 className="text-3xl font-black text-white mb-2">🧪 Test Flavor</h1>
      <p className="text-gray-400 mb-8">{flavor?.slug} — {flavor?.description}</p>

      <div className="grid grid-cols-2 gap-8">
        {/* Upload */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Upload Test Image</h2>
          <label className="block w-full border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {preview ? (
              <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div>
                <p className="text-4xl mb-2">📸</p>
                <p className="text-gray-400">Click to upload an image</p>
                <p className="text-gray-600 text-sm mt-1">JPEG, PNG, WebP, GIF, HEIC</p>
              </div>
            )}
          </label>

          {error && <p className="text-red-400 mt-4">{error}</p>}
          {step && <p className="text-indigo-400 mt-4 animate-pulse">{step}</p>}

          <button
            onClick={handleTest}
            disabled={loading || !file}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Captions"}
          </button>
        </div>

        {/* Results */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Generated Captions</h2>
          {captions.length > 0 ? (
            <div className="grid gap-3">
              {captions.map((c, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4">
                  <p className="text-white">{c.content || c.caption || JSON.stringify(c)}</p>
                  {c.like_count !== undefined && <p className="text-gray-500 text-xs mt-2">👍 {c.like_count} likes</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-600">
              <p>Captions will appear here after testing</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}