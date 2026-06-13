// Public VAPID key for Web Push. This is SAFE to ship to the browser — it is the
// `applicationServerKey` passed to PushManager.subscribe(). The matching PRIVATE
// key lives only in the server environment (VAPID_PRIVATE_KEY, Production scope)
// and is never bundled. Regenerate the pair with:
//   node -e "console.log(require('web-push').generateVAPIDKeys())"
export const VAPID_PUBLIC_KEY =
  'BFF-8RsvTujM0FOwLq4Bdw9_f5w6APW6D7RByVKRU1yojl_VChoM_lrubHB22kBaZi6_6a2zJ0XfSCDB6sCdtjg' // pragma: allowlist secret

// RFC 8292 "sub": a contact URI for the push service to reach us if needed.
export const VAPID_SUBJECT = 'mailto:destek@cebindegaleri.com'
