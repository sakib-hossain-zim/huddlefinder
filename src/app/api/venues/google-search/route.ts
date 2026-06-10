export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return Response.json({ results: [] })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Use Places API v1 Text Search
    const searchRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.shortFormattedAddress',
            'places.internationalPhoneNumber',
            'places.location',
            'places.addressComponents',
            'places.rating',
            'places.userRatingCount',
            'places.websiteUri',
            'places.regularOpeningHours',
            'places.primaryType',
            'places.primaryTypeDisplayName',
            'places.businessStatus',
            'places.priceLevel',
            'places.goodForWatchingSports',
            'places.goodForGroups',
            'places.outdoorSeating',
            'places.liveMusic',
            'places.servesBeer',
            'places.servesCocktails',
            'places.reservable',
            'places.takeout',
            'places.delivery',
            'places.restroom',
            'places.accessibilityOptions',
            'places.parkingOptions',
            'places.paymentOptions',
          ].join(','),
        },
        body: JSON.stringify({
          textQuery:        query,
          regionCode:       'CA',
          languageCode:     'en',
          maxResultCount:   8,
        }),
      }
    )

    const searchData = await searchRes.json()

    if (!searchData.places?.length) {
      return Response.json({ results: [] })
    }

    // Filter out permanently closed venues
    const results = searchData.places.filter(
      (p: any) => p.businessStatus !== 'CLOSED_PERMANENTLY'
    )

    return Response.json({ results })
  } catch (err) {
    console.error('Google Places error:', err)
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}