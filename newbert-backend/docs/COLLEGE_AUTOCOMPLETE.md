# Newbert College Autocomplete

## Why this exists

College names are identity data. If students type free text, values such as `REC Banda`, `rec banda`, and `Rajkiya Engineering College, Banda` become different groups. Newbert therefore stores one verified `College` document and lets profiles reference it.

MongoDB is the source of truth. The frontend never contains a fixed college list.

## Data model

`College` stores:

- `_id`: MongoDB identity submitted by the profile form.
- `collegeId`: stable readable slug retained for leaderboard and old-code compatibility.
- `name`, `shortName`, and `abbreviation`: display and search identities.
- `normalizedName`: lowercase, punctuation-free canonical name.
- `city`, `district`, `state`, `stateCode`, and `country`: location.
- `university`, `collegeType`, and `courses`: academic metadata.
- `aliases`: known safe spellings and abbreviations.
- `isActive`: only active records may be selected.
- `metadata`: source and verification information.

`Profile` and `Alumni` both store `collegeRef`, an ObjectId referencing the same `College` collection. During migration they also keep `college`, `collegeName`, and the stable slug `collegeId`, so existing leaderboard, plan, alumni, and profile display code continues to work.

## Search request

The frontend waits 300 ms after typing and calls:

```http
GET /api/colleges/search?q=rec%20ambedkar&state=Uttar%20Pradesh&limit=10
```

`state` is optional. The profile UI omits it so future Indian colleges can be added without a frontend change. `limit` is capped at 25 by the backend.

Example response:

```json
{
  "colleges": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "collegeId": "rec-ambedkar-nagar",
      "name": "Rajkiya Engineering College, Ambedkar Nagar",
      "shortName": "REC Ambedkar Nagar",
      "abbreviation": "REC",
      "city": "Ambedkar Nagar",
      "state": "Uttar Pradesh"
    }
  ]
}
```

## Normalization and ranking

`normalizeCollegeName()` lowercases text, trims it, replaces brackets, parentheses, commas, periods, slashes, dashes, and other punctuation with spaces, then collapses repeated spaces.

For example:

```txt
Rajkiya Engineering College, (REC), Ambedkar Nagar
-> rajkiya engineering college rec ambedkar nagar
```

Search builds a searchable identity from the canonical name, short name, abbreviation, aliases, city, district, and university. It supports token prefixes, so `raj college ambedkar` can match `Rajkiya Engineering College, Ambedkar Nagar`.

Results receive deterministic points for:

1. Exact canonical name.
2. Exact short name or alias.
3. Exact abbreviation.
4. Canonical, short-name, or alias prefix.
5. Exact city.
6. Phrase containment and token coverage.

Raw user text is escaped before it enters a MongoDB regular expression.

## Frontend state

The profile form keeps two different concepts:

- `form.college`: what the user currently sees and types.
- `selectedCollege`: the verified API result, including its MongoDB `_id`.

Editing the text clears `selectedCollege`. Saving without selecting a result displays `Please select a college from the suggestions.` The form sends:

```json
{
  "collegeId": "507f1f77bcf86cd799439011",
  "college": "Rajkiya Engineering College, Ambedkar Nagar"
}
```

The backend does not trust the supplied name. It finds an active College by `_id`, then stores the canonical name, `collegeRef`, and stable `collegeId` from that database document. An invalid or inactive ID returns:

```json
{
  "code": "INVALID_COLLEGE",
  "message": "Please select a college from the suggestions."
}
```

When the profile reloads, `selectedCollege` is reconstructed from the saved `collegeRef`, so an unchanged college does not need to be selected again.

## Seed process

Seed data lives in:

- `data/upRajkiyaEngineeringColleges.js`
- `data/collegeSeedData.js`

Run:

```bash
npm run seed:colleges
```

The script upserts by stable `collegeId`. Running it repeatedly updates existing records and does not create duplicates.

To add colleges later, add a verified object to the maintained data file and run the same command. No autocomplete code change is needed. A future CSV importer or admin editor should write the same College schema.

## Legacy migration

Run the seed first, then:

```bash
npm run migrate:college-references
```

The migration scans Profile and Alumni records that still lack a complete reference. It resolves only exact normalized canonical names, short names, abbreviations, or aliases. Exactly one match is linked; multiple matches are reported as `ambiguous`, and no match is reported as `unresolved`. It never guesses.

Legacy string fields remain during the transition. College-aware Alumni and plan queries prefer `collegeRef`, then stable `collegeId`, then an exact escaped legacy name.

## Why Alumni shares the reference

Using one College document means students and alumni selected as REC Banda point to the same identity. This enables reliable same-college senior matching, Alumni Wall filtering, leaderboards, placement analysis, and future GATE comparisons without spelling-based duplicate groups.
