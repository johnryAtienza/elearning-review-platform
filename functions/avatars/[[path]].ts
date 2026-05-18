import { serveR2Asset } from '../_lib/serveR2'

interface Env { R2_BUCKET: R2Bucket }

export const onRequestGet: PagesFunction<Env> = async ({ params, env, request }) => {
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  return serveR2Asset(env.R2_BUCKET, `avatars/${path}`, request)
}
