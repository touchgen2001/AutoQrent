# Security Guide

This project now includes a baseline security workflow for secret handling.

## 1) Fast risk checks

Run lightweight source scanning:

```bash
pnpm security:scan
```

This catches obvious hard-coded secrets before deploy.

## 2) Encrypt and store critical files

Set passphrase (do not commit this):

```bash
export SECURITY_VAULT_PASSPHRASE='replace-with-long-random-passphrase'
```

Encrypt files listed in `security/important-files.txt`:

```bash
pnpm security:vault:encrypt
```

Outputs:

- `security/vault/encrypted/**/*.enc`
- `security/vault/encrypted/manifest.sha256`
- `security/vault/encrypted/metadata.txt`

Optional (dangerous): remove source files after encrypt:

```bash
bash scripts/security/encrypt-important-files.sh --remove-source
```

## 3) Decrypt when needed

Default decrypt destination (safe):

```bash
pnpm security:vault:decrypt
```

This writes files under `security/vault/decrypted/` (gitignored).

Restore directly to original paths only when required:

```bash
bash scripts/security/decrypt-important-files.sh --restore
```

## 4) What should stay out of Git

Already ignored:

- `.env*` files
- private key and certificate files (`*.pem`, `*.key`, `*.p12`, `*.pfx`)
- service account and credential JSON patterns
- decrypted vault output

## 5) Recommended next hardening steps

1. Move production secrets to Vercel/Supabase secret managers only.
2. Enable branch protection + required checks (`lint`, `build`, `security:scan`).
3. Add CI secret scanner (`gitleaks`) for pull requests.
4. Rotate all existing integration tokens once this workflow is in place.
5. Add WAF/rate limiting in front of public form endpoints.

## 6) GitHub branch protection setup

After pushing this repository to GitHub, open:

- `Settings -> Branches -> Branch protection rules -> Add rule`

Use your default branch (`main` or `master`) and enable:

- `Require a pull request before merging`
- `Require status checks to pass before merging`

Mark these checks as required:

- `CI Security Gate / Lint + Build + Security Scan`
- `CI Security Gate / Gitleaks Scan`
