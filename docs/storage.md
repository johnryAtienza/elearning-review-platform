# Storage and media

## Storage providers

Cloudflare R2 is the primary object store. Supabase and Edge Functions hold the
metadata and authorization logic; browser code does not receive storage secrets.

## Public asset paths

Public or intentionally cacheable assets are stored and referenced with
root-relative paths. Pages Functions proxy the approved public prefixes to R2.
Environment-specific absolute R2 hostnames should not be persisted as lesson or
CMS metadata.

Current path conventions include:

| Asset | Prefix or convention |
|---|---|
| Avatars | `avatars/` |
| Book covers | `covers/` |
| Lesson and other thumbnails | `thumbnails/` |
| CMS assets | `cms/` |
| Quiz images/questions | `quizzes/questions/` or approved quiz paths |
| Lesson video | `videos/lessons/lesson-{lessonId}.{extension}` |
| Reviewer PDF | `reviewers/lesson-{lessonId}.pdf` |
| Solution PDF | `solutions/lessons/{lessonId}/solution.pdf` |

## Premium assets

Lesson videos, reviewer PDFs, and solution PDFs are not treated as public image
assets. `get-signed-urls` verifies access and returns short-lived signed R2 GET
URLs. The browser uses those URLs only for the authorized request.

Uploadable lesson and solution media use the approved path allowlist in
`generate-upload-url`. Uploads are performed with a presigned PUT URL generated
for an authorized Admin user.

## URL normalization

API services normalize stored asset paths for display. Root-relative paths are
resolved through the current application's public asset proxy, while existing
public URLs are preserved where supported. This avoids persisting a URL tied to
one environment.

## Pending lesson preview image

The current branch contains a `preview_image_url` lesson field and an Admin
upload path of `thumbnails/lesson-{lessonId}.{extension}`. This remains pending
and must not be treated as deployed until its migration is confirmed applied and
the code is released.

References:

- `packages/api/src/storagePaths.ts`
- `packages/api/src/storage.service.ts`
- `supabase/functions/generate-upload-url`
- `supabase/functions/get-signed-urls`
