# Documentation and feature change log

## Released/current

- Landing production navigation is aligned into one header row.
- Password visibility toggles are available in the relevant account forms.
- Admin users can trigger password reset and manage devices.
- Admins can manually assign and manage subscriptions with audit reasons.
- Book solution PDFs can be gated by associated book ownership where configured.
- Production video playback uses signed legacy MP4 delivery; the DRM prototype is
  retired.

## Pending/not released

- Curriculum Day desktop hover preview with `View Lesson` CTA (committed,
  release pending).
- Admin-managed Lesson Preview Image field and `lessons.preview_image_url`
  (committed, migration/release pending).
- Related migration-history cleanup and release sequencing.

The preview work must not be described to Admins or students as live behavior
until the database migration is applied and the production applications are
deployed.

## Documentation replacement

This documentation set replaces the fragmented root documentation as the
maintained source. Historical files remain only as compatibility pointers or
supporting references where they are still useful.
