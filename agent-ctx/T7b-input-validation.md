# Task T7b — Add Input Validation to API Routes

## Summary
Added Zod schema validation to 5 API routes that were missing it, and confirmed 3 routes already had proper validation or didn't need it.

## Routes Validated (5 new)

| Route | Method | Schema | What it validates |
|---|---|---|---|
| `src/app/api/live/route.ts` | POST | `createLiveSessionSchema` | `title` (required, trimmed, max 200), `drillId` (optional string), `maxViewers` (int 2–100, default 10) |
| `src/app/api/live/[id]/score/route.ts` | PUT | `liveScoreUpdateSchema` | `score` (0–10000), `reps` (int 0–10000, default 0) |
| `src/app/api/sync/push/route.ts` | POST | `syncPushSchema` | `actions` (array of typed sync actions, 1–100), `deviceId` (required string) |
| `src/app/api/notifications/push/register/route.ts` | POST | `pushRegisterSchema` | `pushToken` (required), `deviceName`, `deviceType` (enum), `os`, `appVersion` |
| `src/app/api/devices/route.ts` | POST | `registerDeviceSchema` | `name`, `type` (enum), `os`, `appVersion`, `pushToken` (nullable), `deviceId` (optional) |

## Routes Already Validated / No Validation Needed (3)

| Route | Reason |
|---|---|
| `src/app/api/notifications/subscribe/route.ts` | Already uses `notificationSubscribeSchema` + `safeParse` |
| `src/app/api/sync/pull/route.ts` | GET-only, no request body |
| `src/app/api/live/[id]/route.ts` | GET + DELETE only, no request body |

## New Schemas Created (in `src/lib/validations.ts`)

1. **`createLiveSessionSchema`** — title, drillId, maxViewers
2. **`liveScoreUpdateSchema`** — score, reps
3. **`syncPushSchema`** (with nested `syncActionSchema`) — actions array with typed entries, deviceId
4. **`pushRegisterSchema`** — pushToken, deviceName, deviceType, os, appVersion
5. **`registerDeviceSchema`** — name, type, os, appVersion, pushToken, deviceId

## Pattern Used
All routes follow the same pattern:
```typescript
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
}
const { ... } = parsed.data
```

## Lint Result
✅ 0 errors, 4 warnings (all pre-existing, unrelated to this change)