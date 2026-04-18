export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const url = process.env.PYTHON_SERVICE_URL
  if (!url) {
    return Response.json({ error: 'PYTHON_SERVICE_URL not set' }, { status: 500 })
  }

  const { profile } = await req.json()
  const res = await fetch(`${url}/hash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: JSON.stringify(profile) }),
    cache: 'no-store',
  })
  const data = await res.json()
  return Response.json(data)
}
