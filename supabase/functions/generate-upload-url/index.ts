/**
 * generate-upload-url — Supabase Edge Function
 *
 * Generates a presigned PUT URL for direct browser → R2 uploads.
 * Runs server-side so R2 secrets never reach the browser.
 *
 * POST /functions/v1/generate-upload-url
 * Authorization: Bearer <supabase-jwt>
 * Body: { path: string; contentType: string }
 *
 * Response: { uploadUrl: string; publicUrl: string }
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Presigned URL is valid for 15 minutes — enough for any upload. */
const PRESIGNED_URL_TTL = 900

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // ── Auth check ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const supabaseKey  = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase     = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { path?: string; contentType?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { path, contentType } = body
  if (!path || !contentType) {
    return json({ error: 'path and contentType are required' }, 400)
  }

  // ── Build R2 client ──────────────────────────────────────────────────────────
  const accountId       = Deno.env.get('R2_ACCOUNT_ID')
  const accessKeyId     = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const bucketName      = Deno.env.get('R2_BUCKET_NAME')
  const publicBaseUrl   = Deno.env.get('R2_PUBLIC_URL') ?? ''

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('[generate-upload-url] Missing R2 environment variables')
    return json({ error: 'Storage not configured' }, 500)
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  // ── Generate presigned PUT URL ───────────────────────────────────────────────
  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucketName, Key: path, ContentType: contentType }),
      { expiresIn: PRESIGNED_URL_TTL },
    )

    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${path}`
      : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${path}`

    return json({ uploadUrl, publicUrl })
  } catch (err) {
    console.error('[generate-upload-url] Failed to generate presigned URL:', err)
    return json({ error: 'Failed to generate upload URL' }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
