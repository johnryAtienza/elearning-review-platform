# Retired functionality

This document keeps historical behavior separate from active instructions.

## Standalone Portal production deployment

The separate Portal Pages deployment is retired. Production students use
Landing at `/portal/*`. The Portal app remains for source reuse and local
development.

## DRM prototype

The vendor-neutral DRM foundation was a prototype and was reverted/archived.
Current production playback uses the legacy signed MP4 delivery path. The DRM
documentation is retained as historical context only.

## Direct `subscribe` flow

The direct `subscribe` Edge Function path is disabled and returns HTTP 410. It
must not be used as an active payment or entitlement flow.

## Legacy routes

Older student route patterns remain only as compatibility redirects into the
current `/portal/*` route tree. They are not separate supported applications.
