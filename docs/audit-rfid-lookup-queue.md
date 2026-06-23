# Audit RFID Lookup Queue

This document explains the audit scan lookup approach used in
`src/features/audits/hooks/useAuditScanState.ts`.

The scanner can send many RFID tags at the same time. Calling the inventory
search API for every tag in parallel can overload the backend and cause random
failures. The current implementation uses a small client-side queue, immediate
visual feedback, deduplication, and retry handling.

## Goals

- Avoid sending 50 or 100 inventory lookup requests at the same time.
- Keep the existing audit UI unchanged.
- Show scanned tags immediately so the user does not think scanning is stuck.
- Replace temporary scanned tag rows with real inventory details when the API
  responds.
- Avoid duplicate API calls when the same RFID appears repeatedly.
- Keep failed lookup tags visible so scanned audit evidence is not lost.
- Wait for queued and running lookups before submit builds the staging payload.

## Main Code Locations

All queue behavior lives in `src/features/audits/hooks/useAuditScanState.ts`.

- `INVENTORY_LOOKUP_RETRY_DELAYS_MS`
  Retry delays used by the inventory lookup retry helper.

- `INVENTORY_LOOKUP_CONCURRENCY`
  Maximum number of inventory lookup API requests allowed to run at the same
  time.

- `InventoryLookupQueueJob`
  Internal queue job shape for one tag lookup.

- `searchInventoryBarcodeWithRetry(tagId)`
  Calls `apiService.searchInventoryBarcodeScanMode(tagId)` and retries after
  temporary failures.

- `lookupQueueRef`
  Stores RFID lookup jobs waiting for their turn.

- `activeLookupCountRef`
  Tracks how many lookup requests are currently running.

- `processInventoryLookupQueue()`
  Starts queued jobs while the active request count is below the concurrency
  limit.

- `enqueueInventoryLookup(tagId)`
  Adds one tag lookup to the queue and returns a promise for its API result.

- `resolveAuditItem(tagId)`
  Handles cache checks, duplicate request prevention, queueing, item mapping,
  staging lookup registration, and fallback behavior.

- `handleMqttMessage(payload)`
  Reads MQTT tags, shows fallback scan items immediately, then updates each row
  as its queued lookup finishes.

- `clearScanSession(nextPhase)`
  Clears queue state, cache state, pending lookups, staged lookups, and visible
  scan state when the audit session changes.

## Queue Flow

When the scanner sends tags:

1. `handleMqttMessage` extracts tag IDs from the MQTT payload.
2. The hook updates `scannedTagIdsRef`.
3. The hook immediately inserts fallback UI items using
   `mapInventoryToAuditItem(tagId, null)`.
4. For each tag, `resolveAuditItem(tagId)` is called.
5. `resolveAuditItem` checks whether the tag is already resolved or already
   pending.
6. If it is new, `enqueueInventoryLookup(tagId)` adds it to the queue.
7. `processInventoryLookupQueue` runs up to `INVENTORY_LOOKUP_CONCURRENCY`
   API calls at a time.
8. When a lookup succeeds, the row is replaced with the mapped inventory item.
9. When a lookup fails after retries, the fallback unmatched RFID item remains.

## Scenario Handling

### 1. Five RFID tags scanned together

Instead of firing 5 API calls at the same time, the hook queues all 5 tags.
Only `INVENTORY_LOOKUP_CONCURRENCY` requests run at once. With the current value
of `3`, the first 3 tags start immediately and the next 2 wait.

The user still sees all 5 scanned tags immediately because fallback items are
inserted before the API responses return.

### 2. One hundred RFID tags scanned together

All 100 tags are accepted into client state immediately, but the backend only
receives a few lookup calls at a time.

This protects the server from request bursts while still giving the user instant
feedback that tags were detected. Inventory details fill in gradually as each
queued request completes.

### 3. Same RFID tag appears repeatedly

Duplicate API calls are avoided by `resolveAuditItem`.

It checks:

```ts
const cachedItem = itemCacheRef.current.get(tagId);
if (cachedItem) {
  return cachedItem;
}

const pendingLookup = pendingLookupsRef.current.get(tagId);
if (pendingLookup) {
  return pendingLookup;
}
```

If the item is already resolved, the cached item is reused. If it is running or
waiting in the queue, the existing promise is reused. This means repeated scanner
messages for the same RFID do not create repeated API calls.

### 4. Tag is queued but not started yet, then the same tag appears again

This is also covered by `pendingLookupsRef`.

`resolveAuditItem` stores the lookup promise in `pendingLookupsRef` immediately
after queueing:

```ts
pendingLookupsRef.current.set(tagId, lookupPromise);
```

Because this happens before the API request starts, a queued tag is already
treated as pending. Repeated scans return the same promise.

### 5. API is slow

The UI does not wait for the API before showing that something was scanned.
`handleMqttMessage` immediately creates fallback rows:

```ts
itemCacheRef.current.get(tagId) ?? mapInventoryToAuditItem(tagId, null)
```

Later, when the API result arrives, `setMqttItems` replaces the fallback row
with the resolved inventory item. This avoids a blank screen during a 3-4 second
batch lookup.

### 6. API fails temporarily

`searchInventoryBarcodeWithRetry` retries the inventory search using:

```ts
const INVENTORY_LOOKUP_RETRY_DELAYS_MS = [300, 900, 1800] as const;
```

If the request fails, the helper waits for the configured delay and retries.
After all retry attempts fail, the error is logged and the tag remains visible
as the fallback unmatched RFID item.

### 7. API fails permanently for one tag

The failed tag is not removed from the UI. It stays as an unmatched RFID asset.
This is intentional because an unknown or unresolvable RFID is still important
audit evidence.

The rest of the queue continues processing. One failed RFID does not block other
RFID lookups.

### 8. User submits while lookups are still queued or running

Submit waits for pending lookup promises before building the staging payload:

```ts
const pendingLookups = tagIds.flatMap((tagId) => {
  const pendingLookup = pendingLookupsRef.current.get(tagId);
  return pendingLookup ? [pendingLookup] : [];
});

if (pendingLookups.length > 0) {
  await Promise.all(pendingLookups);
}
```

Because queued tags are also stored in `pendingLookupsRef`, submit waits for
both running and not-yet-started queued lookups.

### 9. User changes warehouse, resets audit, or starts a new session

`clearScanSession` increments `scanSessionRef`, rejects queued jobs, clears the
queue, clears pending lookups, and clears cache state.

This prevents stale API responses from an old audit session from modifying the
next audit screen.

## Why We Show Fallback Items Immediately

The UI cannot currently add a new `Checking...` state without changing the
existing visual contract. To avoid a blank screen, the hook uses the existing
fallback item shape while the lookup is pending.

This means the temporary row can look like an unmatched RFID asset until the API
returns. That is a UI limitation, not a queue problem.

The alternative approach, hiding tags until API success, has production risks:

- The user may think scanning failed while 100 lookups are queued.
- Failed or unknown tags may disappear completely.
- Repeated scans are more likely because the operator does not see immediate
  feedback.
- Audit evidence can be lost from the user's perspective.

For audit workflows, detected tags should remain visible even if inventory
resolution is delayed or fails.

## Tuning

The main tuning value is:

```ts
const INVENTORY_LOOKUP_CONCURRENCY = 3;
```

Use `1` if the backend is fragile and must receive one lookup at a time.
Use `2` or `3` for a safer production balance.
Avoid high values such as `10` or `20` unless the backend is designed for that
load.

Retry delays can be tuned here:

```ts
const INVENTORY_LOOKUP_RETRY_DELAYS_MS = [300, 900, 1800] as const;
```

Longer delays reduce backend pressure during outages but make final resolution
slower.

## Future Improvement

The best long-term backend improvement is a bulk lookup endpoint:

```txt
POST /inventory/search-bulk
body: { tagIds: string[] }
```

With a bulk endpoint, the app could send 100 tags in one request or in small
batches instead of queueing 100 individual GET requests.

Until that exists, the current queue approach protects the backend and keeps the
scan experience responsive without changing the current UI.
