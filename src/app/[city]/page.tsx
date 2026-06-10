export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  return <div>City: {city}</div>
}