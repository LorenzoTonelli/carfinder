import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-3">
          <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase">AI-powered</p>
          <h1 className="text-5xl font-bold text-white leading-tight">
            Find your perfect car
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            Chat with our AI for a few minutes. It learns what matters to you
            and matches you with the top 3 vehicles for your life.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/chat"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start the conversation →
          </Link>
        </div>

        <div className="flex gap-8 justify-center text-sm text-gray-500">
          <span>~5 min</span>
          <span>·</span>
          <span>Top 3 picks</span>
          <span>·</span>
          <span>No signup needed</span>
        </div>
      </div>
    </main>
  )
}
