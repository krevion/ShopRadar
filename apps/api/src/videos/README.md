# Videos module

Video metadata, likes, comments, seller favourites, and seller messages are stored in the Prisma database; uploaded media is saved under `uploads/videos`. Configure `API_PUBLIC_URL` to the externally reachable API origin and persist that upload directory in deployed environments.

Uploads require a bearer JWT for an active seller account and an approved and verified seller profile. New seller profiles can publish during the first 30 days after registration; after the trial, a successful M-Pesa seller subscription payment of at least KSh 1,000 from the previous 30 days is required. The subscription is intended to complete seller activation and provide the full ShopRadar business toolkit, including video promotion. Payments are currently disabled. The API enforces the 100 MB file limit and probes the media duration with `ffprobe` before publishing; only MP4, WebM, and MOV are accepted.

Subscription callbacks must reach `/api/payments/mpesa/callback`. Set `MPESA_CALLBACK_URL` to a public HTTPS URL in deployed environments. Each payment uses an unguessable, one-time callback URL token; only a matching successful callback with the expected amount activates the subscription.
