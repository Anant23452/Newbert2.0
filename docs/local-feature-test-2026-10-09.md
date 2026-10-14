# Local feature test — 9 October 2026

Target: `http://localhost:5173/`

## What worked

- Vite served the frontend locally.
- Home, Alumni Wall, Join, Roadmap, Jobs, Leaderboard, Mentorship, Resume AI, Courses, Notes, and Study Studio all rendered their expected route content.
- Local sign-up modal opened and browser validation rejected an invalid email.
- The unauthenticated alumni route loaded its welcome screen and Start control.

## Blocking issue

Dummy login (`newbert.qa.20261009@example.com`) did not complete. The UI showed `Unable to sign in. Please try again.` The backend process exited before listening because its MongoDB SRV lookup timed out:

`Database connection failed: querySrv ETIMEOUT _mongodb._tcp.newbert-cluster.otwxlwl.mongodb.net`

Because the API was unavailable, the local login could not be verified and the alumni chatbot could not save its first answer. After Start, the UI showed `Your answer could not be saved. Keep this page open and try again.`

## Additional local warning

Google sign-in is not configured locally. The browser logged `The given client ID is not found` and the generated iframe used `client_id=not-configured`.

## Not a frontend route failure

The frontend itself rendered the tested routes. API-backed behavior remains untested locally until MongoDB connectivity and local Google configuration are supplied. No real credentials or external accounts were used.
