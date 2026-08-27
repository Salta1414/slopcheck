# Screenshot share-for-free

The free full review uses a manual X post and screenshot verification. Slopcheck
does not publish posts through the X API, so this flow does not require
`tweet.write`, X client credentials, or X API credits.

## User flow

1. Slopcheck creates a short-lived post challenge with a unique proof code.
2. The user copies the prepared text and opens X's post composer.
3. The user publishes the post on X.
4. The user uploads a screenshot showing the published post.
5. A vision check looks for the published X UI, score, public scan link,
   `#slopcheck`, and the one-time proof code.
6. The challenge is consumed and the full review is queued atomically.

Screenshot verification is intentionally a lightweight anti-abuse measure, not
cryptographic proof. Challenges expire after 15 minutes and only one successful
free claim is allowed per scan.

## Convex environment

Only the existing AI environment is needed. Remove the old X credentials from
the Convex Production environment when convenient; the screenshot flow does
not read them.

## Notes

- Accepted uploads: PNG, JPEG, and WebP up to 8 MB.
- Uploaded screenshots are deleted after verification or challenge expiry.
- A rejected screenshot consumes that challenge; the user can prepare a new
  challenge and try again.
