export default async function SportPage({ params }: { params: Promise<{ city: string; sport: string }> }) {
  const { city, sport } = await params
  return <div>{city} — {sport}</div>
}