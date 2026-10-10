# Payments

M-Pesa is intentionally disabled while ShopRadar's Safaricom account details are pending. The API keeps `PAYMENTS_ENABLED=false` by default and rejects payment initiation and callback requests while disabled.

Before enabling the integration, configure these values as hosting-provider secrets:

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_ENVIRONMENT` (`sandbox` or `production`)
- `MPESA_CALLBACK_URL` — the public HTTPS callback on the deployed API
- `PAYMENTS_ENABLED=true` only after the callback is registered and verified with Safaricom

Do not put production credentials in `.env.example`, source control, or a public message. New seller profiles receive a 30-day free trial. With payments disabled, sellers can use the trial but cannot activate paid subscription time after it ends. The KSh 1,000 seller subscription is intended to complete seller activation and unlock the full ShopRadar business toolkit, including video promotion. Public shop discovery still requires seller approval.
