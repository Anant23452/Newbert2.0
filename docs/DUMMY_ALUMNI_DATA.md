# Dummy Alumni Data

Six fictional fixtures cover full-stack placement, backend placement, ML placement, an IIT-style GATE outcome, a fictional PSU outcome, and a combined placement/GATE path.

Every fixture has `isDummyData: true` and a stable `dummyKey`. Fictional companies and destinations are used where practical. Fixtures contain structured outcomes, preparation phases, comparisons, courses/reviews, advice, and mentorship settings for development testing.

## Safety

Dummy scripts require:

```env
ALLOW_DUMMY_ALUMNI=true
```

They refuse to run when `NODE_ENV=production`. Public alumni APIs also hide dummy records unless the same development flag is enabled outside production. The server never auto-seeds data.

## Commands

```bash
npm run seed:dummy-alumni
npm run clear:dummy-alumni
```

Both commands are idempotent with stable `dummyKey` values. Clear removes only documents with `isDummyData: true`.

## Replacing Fixtures

Real alumni should be collected through a verified administrative or alumni self-service workflow, linked to `User` when mentorship management is needed, and stored with `isDummyData: false`. Never convert fixture reviews into global course rankings; real reviews should remain attributable alumni evidence.

