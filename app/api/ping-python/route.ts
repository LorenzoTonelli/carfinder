export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.PYTHON_SERVICE_URL
  if (!url) {
    return Response.json({ error: 'PYTHON_SERVICE_URL not set' }, { status: 500 })
  }

  const res = await fetch(`${url}/ping`, { cache: 'no-store' })
  const data = await res.json()
  return Response.json(data)
}
