'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, Recommendation, ChatMessage } from '@/types'

export default function RecommendationsPage() {
  const router = useRouter()
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('carfinder_profile')
    if (!stored) { router.push('/chat'); return }

    const parsed: UserProfile = JSON.parse(stored)
    setProfile(parsed)

    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: parsed }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setRecs(data.recommendations)
        setSummary(data.summary)
        setChatMessages([{ role: 'assistant', content: data.summary }])
      })
      .catch(() => setError('Failed to load recommendations. Please try again.'))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendFollowup() {
    const text = chatInput.trim()
    if (!text || chatLoading || !profile) return
    setChatInput('')

    const next: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(next)
    setChatLoading(true)
    setChatMessages(m => [...m, { role: 'assistant', content: '' }])

    const res = await fetch('/api/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, profile, recommendations: recs }),
    })

    if (!res.ok || !res.body) {
      setChatMessages(m => [...m.slice(0, -1), { role: 'assistant', content: 'Sorry, something went wrong.' }])
      setChatLoading(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let acc = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      acc += decoder.decode(value, { stream: true })
      setChatMessages(m => [...m.slice(0, -1), { role: 'assistant', content: acc }])
    }
    setChatLoading(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFollowup() }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Finding your perfect matches…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button onClick={() => router.push('/chat')} className="text-blue-400 hover:underline text-sm">
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-gray-300 font-medium">Your top matches</span>
        <button onClick={() => router.push('/chat')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Start over
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Recommendation cards — left 2/3 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {recs.map((rec, i) => (
            <RecCard key={rec.vehicle.id} rec={rec} rank={i + 1} />
          ))}
        </div>

        {/* Side chat — right 1/3 */}
        <div className="w-96 border-l border-gray-800 flex flex-col bg-gray-900">
          <div className="px-4 py-3 border-b border-gray-800 text-sm text-gray-400 font-medium">
            Ask the AI
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {msg.content || (chatLoading && i === chatMessages.length - 1
                    ? <span className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      </span>
                    : null
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-800 flex gap-2">
            <textarea
              rows={1}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a follow-up…"
              disabled={chatLoading}
              className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendFollowup}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const rankLabels = ['', '🥇', '🥈', '🥉']
  const v = rec.vehicle

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{rankLabels[rank]}</span>
            <h2 className="text-xl font-bold text-white">
              {v.year} {v.make} {v.model}
            </h2>
          </div>
          <p className="text-gray-400 text-sm">{v.trim}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-white">${v.msrp.toLocaleString()}</p>
          <p className="text-gray-500 text-xs">MSRP</p>
        </div>
      </div>

      {/* Specs row */}
      <div className="flex gap-4 text-sm text-gray-400">
        {v.fuel_type === 'electric'
          ? <span>{v.range_miles} mi range</span>
          : <span>{v.mpg_combined} MPG</span>
        }
        <span>·</span>
        <span>{v.seats} seats</span>
        <span>·</span>
        <span>{v.cargo_cuft} cu ft</span>
        <span>·</span>
        <span className="capitalize">{v.fuel_type}</span>
      </div>

      {/* Likes & dislikes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">What you'll like</p>
          <ul className="space-y-1">
            {rec.likes.map((like, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{like}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Watch out for</p>
          <ul className="space-y-1">
            {rec.dislikes.map((dislike, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-amber-500 mt-0.5">!</span>
                <span>{dislike}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI explanation */}
      {rec.explanation && (
        <div className="border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400 leading-relaxed italic">"{rec.explanation}"</p>
        </div>
      )}
    </div>
  )
}
