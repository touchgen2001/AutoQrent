# Cloudflare WAF Rules (Production)

Use `security/cloudflare-waf-rules.json` as the source template.

## Endpoint coverage

- `/api/contact` (POST)
- `/api/public/vehicle-events` (POST)
- `/api/public/showroom-events` (POST)
- `/api/auth/login` (POST)

## Recommended enforcement

1. `managed_challenge` for bursty traffic.
2. hard `block` for known bot traffic on these endpoints.
3. start in log/simulate mode for 24 hours, then switch to enforce mode.

## Suggested rate-limit baselines

- contact form: `15 req / 10 min / IP`
- vehicle events: `120 req / 5 min / IP`
- showroom events: `120 req / 5 min / IP`
- auth login: `20 req / 10 min / IP`

## Operational checklist

1. Enable Cloudflare Security Events alerting.
2. Validate false-positive rates after first 24 hours.
3. Tune limits with real traffic and conversion impact.
