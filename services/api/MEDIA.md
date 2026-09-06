# Media storage

The API exposes `POST /v1/uploads/presign` for authenticated users. It returns a short-lived signed `PUT` URL and a public asset URL for portfolio files, videos, and avatars.

Configure an S3-compatible bucket with `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `MEDIA_PUBLIC_BASE_URL`. AWS S3, Cloudflare R2, and compatible providers are supported. Keep the bucket private for originals when possible and expose assets through a CDN or controlled public object policy.

Client flow:

1. Request a presigned URL with the filename, MIME type, and purpose.
2. Upload the file directly to the returned URL with an HTTP `PUT` and matching `Content-Type`.
3. Store the returned `publicUrl` in the portfolio item or video record.

The current endpoint intentionally does not accept file bytes through the API, which keeps large uploads out of the Render web service.