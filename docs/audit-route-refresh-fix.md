# Audit Route Refresh Fix

## Problem

After deployment, refreshing the `/audits` page showed a server message:

```txt
You do not have permission to view this directory or page.
```

The issue happened only on the audit page. Localhost worked because the Expo dev
server handles client-side route fallback automatically.

## Root Cause

The app had this route structure:

```txt
src/app/(app)/audits.tsx
src/app/(app)/audits/submit.tsx
```

That made `audits` both:

- a page route: `/audits`
- a folder route namespace: `/audits/submit`

In static deployment, refreshing `/audits` can make the hosting server treat
`/audits` as a directory. If that directory has no default `index.html`, the
server blocks direct directory access and shows the permission message before
the React app loads.

## Fix

The `/audits` page was moved into the `audits` folder as an index route:

```txt
src/app/(app)/audits/index.tsx
src/app/(app)/audits/submit.tsx
```

The URL stays the same:

```txt
/audits
/audits/submit
```

Only the file organization changed.

## Impact

- Existing navigation like `router.push("/audits")` continues to work.
- `/audits/submit` continues to work.
- No audit UI or business logic changed.
- The deployed server now has a proper index route for `/audits`, so refresh
  should no longer hit a blocked directory.
