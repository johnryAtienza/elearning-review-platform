const PUBLIC_PREFIXES = ['thumbnails/', 'avatars/', 'quizzes/', 'covers/'] as const

function hasBody(obj: R2Object | R2ObjectBody): obj is R2ObjectBody {
  return 'body' in obj
}

export async function serveR2Asset(
  bucket: R2Bucket,
  key: string,
  request: Request,
): Promise<Response> {
  if (!PUBLIC_PREFIXES.some(p => key.startsWith(p))) {
    return new Response('Not found', { status: 404 })
  }

  const ifNoneMatch = request.headers.get('if-none-match')
  const object = ifNoneMatch
    ? await bucket.get(key, { onlyIf: { etagDoesNotMatch: ifNoneMatch } })
    : await bucket.get(key)

  if (object === null) {
    return new Response('Not found', { status: 404 })
  }

  // R2 returns an R2Object (no body) when the onlyIf precondition fails.
  if (!hasBody(object)) {
    return new Response(null, { status: 304, headers: { etag: object.httpEtag } })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=86400, s-maxage=604800')
  return new Response(object.body, { headers })
}
