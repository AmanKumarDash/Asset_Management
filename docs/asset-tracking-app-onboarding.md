# Asset Tracking App — Onboarding Documentation

## 1. Project Overview

This is an Expo React Native application for asset tracking and auditing. The app supports role-based access for `admin` and `employee` users, with a splash/login flow, dashboard, audit workflows, employee management, reports, and profile management.

The project is structured with Expo Router and uses TypeScript, Tailwind-style styling via NativeWind, and Axios for network/API calls.

---

## 2. Tech Stack

- Expo (SDK ~54)
- React Native 0.81
- Expo Router
- TypeScript
- Axios for HTTP requests
- NativeWind / Tailwind CSS for styling
- React Navigation elements for app routing controls
- Hermes JS engine for Android

---

## 3. Run & Build Commands

- `npm install` — install dependencies
- `npm start` — start Expo Metro
- `npm run android` — build/run on Android device/emulator
- `npm run ios` — build/run on iOS device/simulator
- `npm run web` — run web version
- `npm run lint` — run ESLint
- `npm run build:apk` — build Android APK via EAS
- `npm run build:aab` — build Android AAB via EAS

---

## 4. Environment Configuration

The app reads API configuration from environment variables.

File: `.env.example`

```env
EXPO_PUBLIC_API_URL=https://backend-prepod.smaketsolutions.com
```

Key environment variable:

- `EXPO_PUBLIC_API_URL` — base URL for all Axios API calls.

If this variable is missing, the app will throw an error before making network requests.

---

## 5. App Entry Points & Routing

### Root app files

- `src/app/_layout.tsx`
  - Root layout for the app.
  - Wraps the entire app in `AuthSessionProvider`.
  - Renders the Expo Router `Stack` with no headers.

- `src/app/index.tsx`
  - Initial splash route.
  - Shows `BrandSplashScreen`.
  - After splash, redirects to `/dashboard` when signed in or `/login` otherwise.

### Authentication route

- `src/app/(auth)/login.tsx`
  - Renders `LoginScreen` from `features/auth/screens`.

### Protected app routes

- `src/app/(app)/_layout.tsx`
  - Requires an authenticated user.
  - If no user exists, redirects to `/login`.
  - Wraps authenticated routes in `AppShell`.

### Main routes under `(app)`

- `src/app/(app)/dashboard.tsx` — Dashboard screen
- `src/app/(app)/profile.tsx` — Profile screen
- `src/app/(app)/reports.tsx` — Reports screen
- `src/app/(app)/audits/submit.tsx` — Audit submission screen for employees only
- `src/app/(app)/employees/index.tsx` — Employee list for admins only
- `src/app/(app)/employees/new.tsx` — Add new employee for admins only

---

## 6. Navigation & Layout

### AppShell

- `src/features/navigation/components/AppShell.tsx`
  - Chooses layout by screen width.
  - Uses bottom navigation for mobile.
  - Uses sidebar navigation for desktop.
  - Hides mobile navigation on certain pages like `/employees/new`, `/reports`, and `/audits/*`.

### Bottom navigation

- `src/features/navigation/components/AppBottomNav.tsx`
  - Renders mobile nav items.
  - Uses `getMobileNavItems()` based on user role.

### Navigation configuration

- `src/features/navigation/config/navItems.ts`
  - Defines desktop and mobile nav items for `admin` and `employee`.
  - Controls labels, routes, and icons in the main app navigation.

---

## 7. Authentication Flow

### Auth session provider

- `src/features/auth/context/AuthSessionProvider.tsx`
  - Holds `user` session state.
  - Provides `signIn`, `signOut`, `updateUser`, and `hasPermission`.
  - Uses `apiService.login()` for authentication.
  - Stores auth token via `setAccessToken()`.

### Auth hook

- `src/features/auth/hooks/useAuthSession.ts`
  - Returns auth session context.
  - Throws if used outside `AuthSessionProvider`.

### Access control

- `src/features/auth/components/AccessGuard.tsx`
  - Protects routes by role and permissions.
  - Redirects unauthorized users to `/dashboard` or `/login`.

### Type definitions

- `src/features/auth/types/auth.ts`
  - Defines `UserRole`, `AppPermission`, `AppUser`, and session context types.

- `src/features/auth/types/authApi.ts`
  - Defines API login response shape.
  - Handles both `user` and `User` payload formats.

### Auth mapping

- `src/features/auth/utils/authMapper.ts`
  - Normalizes API user data into internal `AppUser`.
  - Normalizes role names and permissions.
  - Builds display fields like initials, badges, and avatar styling.

---

## 8. API Integration

### Axios configuration

- `src/network/axiosConfig.ts`
  - Creates a shared `axiosInstance`.
  - Uses `API_BASE_URL` from `EXPO_PUBLIC_API_URL`.
  - Sets default headers for JSON.
  - Adds request interceptor to attach `Authorization: Bearer <token>` when available.
  - Adds response interceptor for centralized logging on errors.

### API endpoints

- `src/network/endpoints.ts`
  - Defines endpoint constants.
  - Current endpoint:
    - `AUTH.LOGIN = "/api/Account/validatelogin"`

### API service

- `src/network/ApiService.ts`
  - Provides `login()`.
  - Uses `assertApiBaseUrlConfigured()` before sending requests.
  - Sends login payload to `ENDPOINTS.AUTH.LOGIN`.
  - Uses `extractResponseData()` to unwrap response envelopes.

### Response helpers

- `src/network/responses.ts`
  - Defines `ApiEnvelope<T>`.
  - Supports payloads wrapped inside `data`.
  - Provides error message extraction from Axios errors.

---

## 9. High-Level Folder Structure

### `src/app/`
- App routing and Expo Router pages.
- `src/app/_layout.tsx` — root layout.
- `src/app/index.tsx` — splash and redirect.
- `src/app/(auth)/login.tsx` — login route.
- `src/app/(app)/` — authenticated app routes.

### `src/features/`
- `auth/` — login, session context, permissions, access guard, auth mapping.
- `navigation/` — app shell, bottom nav, sidebar, nav configuration.
- `dashboard/` — dashboard screens and components.
- `reports/` — report screens.
- `employees/` — employee screens and admin user management.
- `audits/` — audit screens and employee audit submission.
- `profile/` — profile screens.
- `splash/` — branded splash screen.
- `asset/`, `category/`, `checkout/`, `subcategory/` — feature modules for asset management.

### `src/network/`
- `axiosConfig.ts` — Axios base setup.
- `endpoints.ts` — API endpoint definitions.
- `ApiService.ts` — request wrappers.
- `responses.ts` — payload parsing and error helpers.

### `src/theme/`
- `adminTheme.ts` — shared color/theme palette used across the app.

### Root config files
- `app.json` — Expo project config, app metadata, plugins, and platforms.
- `package.json` — dependencies and npm scripts.
- `tsconfig.json` — TypeScript config.
- `babel.config.js` — Babel settings.
- `tailwind.config.js` — Tailwind / NativeWind configuration.
- `global.css` — global CSS variables and styles.

---

## 10. Important Connections

### Auth → API → Session

1. User submits login form in `LoginScreen`.
2. `AuthSessionProvider.signIn()` calls `apiService.login()`.
3. `ApiService.login()` posts to `ENDPOINTS.AUTH.LOGIN`.
4. Response is normalized by `mapLoginResponse()`.
5. `setAccessToken()` stores the token for Axios auth headers.
6. `user` state is stored in `AuthSessionProvider`.
7. Protected routes use `useAuthSession()` and `AccessGuard`.

### Screen routing

- `src/app/index.tsx` decides whether to redirect to `/dashboard` or `/login`.
- `src/app/(app)/_layout.tsx` blocks access if the user is not signed in.
- `AppShell` renders mobile or desktop navigation depending on screen width.
- `navItems.ts` defines which pages appear for admin vs employee.

---

## 11. Notes for a New Joiner

- Start with `src/app/_layout.tsx` and `src/app/index.tsx` to understand the root flow.
- Follow the auth flow through `AuthSessionProvider`, `ApiService`, and `authMapper`.
- Use `src/features/navigation/config/navItems.ts` to see how menu items are generated.
- Most page containers are in `src/app/(app)` and render feature screens from `src/features/*`.
- Role-based access is centralized in `AccessGuard`.
- If you need to add a new API call, extend `src/network/endpoints.ts`, add a method in `src/network/ApiService.ts`, and add type definitions in `src/features/auth/types` or the relevant feature type folder.

---

## 12. Quick File Map

- `src/app/_layout.tsx` — root provider and router stack
- `src/app/index.tsx` — splash + initial redirect
- `src/app/(auth)/login.tsx` — login route
- `src/app/(app)/_layout.tsx` — authenticated app shell
- `src/app/(app)/dashboard.tsx` — dashboard page
- `src/app/(app)/profile.tsx` — profile page
- `src/app/(app)/reports.tsx` — reports page
- `src/app/(app)/audits/submit.tsx` — employee audit submit page
- `src/app/(app)/employees/index.tsx` — admin employees page
- `src/app/(app)/employees/new.tsx` — admin add employee page
- `src/features/auth/` — auth & session state
- `src/features/navigation/` — layout and navigation
- `src/network/` — Axios + API wiring
- `.env.example` — required API base URL
- `app.json` — Expo configuration

---

## 13. Recommended First Steps

1. Open `src/app/index.tsx` and `src/app/(app)/_layout.tsx`.
2. Read `src/features/auth/context/AuthSessionProvider.tsx`.
3. Review `src/network/axiosConfig.ts` and `src/network/ApiService.ts`.
4. Review `src/features/navigation/components/AppShell.tsx` and `navItems.ts`.
5. Explore one feature folder such as `src/features/employees/` or `src/features/audits/`.

---

## 14. Where to Update This Document

Update this file whenever:
- a new major route is added,
- auth rules or permissions change,
- the API base URL setup changes,
- or the app switching/navigation structure is modified.
