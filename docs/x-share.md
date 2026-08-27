# X share-for-free

The free full review is granted only after the server has:

1. completed X OAuth 2.0 with PKCE;
2. created the post through `POST /2/tweets` using the connected account;
3. read the returned post back and matched its ID, author ID, and exact text;
4. atomically marked the scan as claimed and queued the full review.

No X access token is stored. The PKCE challenge is short-lived and is removed
after completion or cancellation.

## X developer app

Create an X OAuth 2.0 app with these scopes:

- `tweet.read`
- `tweet.write`
- `users.read`

Register this exact callback URL in the X app:

```text
https://glad-peccary-227.eu-west-1.convex.site/x/share/callback
```

The callback must match character-for-character. Use the Convex HTTP Actions
URL for the deployment. For a custom callback URL, set `X_OAUTH_REDIRECT_URI`
to that exact value in the same Convex environment.

## Convex environment

Set the public X client ID and the frontend URL on each deployment separately:

```bash
npx convex env set X_CLIENT_ID <x-client-id> --prod
npx convex env set X_CLIENT_SECRET <x-client-secret> --prod
npx convex env set APP_URL https://slopcheck.dev --prod
```

For development, use the development deployment and its matching frontend URL.
Never copy an X client secret into the frontend or into a `NEXT_PUBLIC_*`
variable. This flow intentionally uses PKCE and keeps the user access token
inside the server action only.
