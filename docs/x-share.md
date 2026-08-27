# Screenshot share-for-free

The free full review uses a manual X post and screenshot verification. Slopcheck
does not publish posts through the X API, so this flow does not require
`tweet.write`, X client credentials, or X API credits.

## User flow

1. Slopcheck assigns the scan one stable proof code and creates a short-lived
   verification challenge for it.
2. The user copies the prepared text and opens X's post composer.
3. The user publishes the post on X.
4. The user uploads a screenshot showing the published post, either by
   choosing an image or pasting it from the clipboard with Ctrl/Cmd + V.
5. A vision check looks for the published X UI, score, public scan link,
   `#slopcheck`, and the scan's stable proof code.
6. The challenge is consumed and the full review is queued atomically.

Screenshot verification is intentionally a lightweight anti-abuse measure, not
cryptographic proof. Challenges expire after 15 minutes, but a retry creates a
new verification challenge with the same scan code and post text. Only one
successful free claim is allowed per scan.

## Convex environment

Only the existing AI environment is needed. Remove the old X credentials from
the Convex Production environment when convenient; the screenshot flow does
not read them.

## Notes

- Accepted uploads: PNG, JPEG, and WebP up to 8 MB. Clipboard paste works for
  image data copied from a screenshot tool or image editor.
- Uploaded screenshots are deleted after verification or challenge expiry.
- A rejected screenshot consumes that verification challenge; the user can
  prepare the same post again and try another screenshot without reposting.
