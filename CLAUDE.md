# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md — **read this first**: Expo has changed significantly across versions. Check the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any Expo/React Native API code (this project pins `expo ~54.0.33`, `react-native 0.81.5`, `react 19.1.0`).

## Commands

There is no build/lint/test tooling configured (no eslint, jest, or TS config) — verify changes by running the app.

```
npm start          # expo start — dev server, pick platform from the CLI menu
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
```

Web production build (no npm script for this — run manually):
```
npx expo export -p web   # outputs to dist/
node postexport.js       # patches dist/index.html (viewport meta, scroll, title, PWA meta tags)
```
`postexport.js` must be re-run after every `expo export` — the patches it applies (iOS/Android web scroll fixes, `100dvh` viewport handling, forced title, manifest/apple-touch-icon links) are not part of the Expo template and get overwritten on each export. `web/index.html` is the source template Expo copies into `dist/`.

Requires a `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (gitignored except `.env` itself, which is committed locally — do not add secrets to other files).

## Architecture

**Baby-link** (package/slug: `creche-connect`/`baby-link`) is an Expo app (iOS + Android + Web/PWA) connecting nurseries (crèches) staff and parents, backed entirely by Supabase (Postgres + Auth + Realtime + Storage). There is no custom backend — all data access is direct `supabase.from(...)` calls from screens, authorized via Postgres RLS.

### Auth & role-based routing (`navigation/index.js`)
A single `NavigationContainer`/`Stack.Navigator` picks which screen group to mount based on Supabase session + the user's `profiles` row, re-evaluated on every auth state change and on realtime `UPDATE` to the user's own profile row:
- No session → auth stack (`Login`, `Register`, `Onboarding`, `CreateNursery`, `JoinNursery`).
- Session but no `creche_id` and role isn't `parent` → onboarding stack (create or join a nursery).
- `profile.role === 'parent'` → parent stack (`ParentTabs` + detail screens).
- Otherwise (staff, e.g. `directrice`/`puericultrice`) → staff stack (`StaffTabs` + detail screens).

Profiles carry `role` (`directrice`, `puericultrice`, `parent`) and `creche_id` (the nursery they belong to); nearly every query filters by `creche_id` scoped from the current user's profile.

### Tab screens are NOT React Navigation tabs
`StaffTabs.js` and `ParentTabs.js` implement their own tab bar with local `useState('activeTab')` and a `SCREENS` lookup map, rendering the active screen directly rather than using `@react-navigation/bottom-tabs`. Each passes a hand-built `navObj` (`{ navigate, goBack }`) down as the `navigation` prop — `navigate(screenKey)` switches the local tab if `screenKey` is one of the tabs, otherwise it forwards to the real stack `navigation.navigate(...)` (used to drill into stack-only screens like `WriteReport`, `Members`, `ChildReports`). Keep this pattern in mind when adding a screen: decide whether it belongs inside a tab group's `SCREENS` map or as a top-level `Stack.Screen` in `navigation/index.js`.

### Shared state via context, not a store
`lib/theme.js` defines `ThemeContext` (light/dark `colors`, `isDark`/`toggleTheme`, `language`/`setLanguage`, and a `t(key)` translator over the inline `translations` dict for `fr`/`en`/`nl`) — provided once at the top of `navigation/index.js` and consumed via `useTheme()`. There is no Redux/Zustand/etc.; per-screen data is fetched directly from Supabase in `useEffect`/handlers.

### Realtime
`lib/useRealtime(tables, onUpdate)` subscribes to Postgres changes (`event: '*'`) on the given tables and calls `onUpdate()` on any change — used by list/dashboard screens to auto-refresh. Screens also open ad hoc `supabase.channel(...)` subscriptions directly (see `navigation/index.js`'s profile-change listener) when they need a filtered/targeted subscription rather than a full refetch.

### Styling convention
Screens/components define `const styles = (theme) => StyleSheet.create({...})` as a function of the current theme and call `const s = styles(theme)` inside the component body — this is how dark/light mode propagates to styles. Follow this pattern rather than static `StyleSheet.create` when a component needs theme-aware colors.

### Web/PWA quirks
A meaningful share of recent commit history (see `git log`) is iOS/Android web scroll and viewport fixes (`100dvh` vs `100vh`, single-scroll-container layouts, `overflow` handling, long-press vs double-tap delete on touch web). When touching layout/scroll code on screens used on web, check `postexport.js` and `web/index.html` for the viewport/scroll CSS already in place before adding new fixes, and test on both native and web — regressions here have recurred multiple times.

## Directory layout
- `screens/auth/` — login/register/onboarding/create-or-join-nursery
- `screens/staff/` — director/nursery-worker screens, tab-routed via `StaffTabs.js`
- `screens/parent/` — parent screens, tab-routed via `ParentTabs.js`
- `components/` — small shared components (`Avatar`, `ModalWithKeyboard` — a bottom-sheet modal with keyboard avoidance, used across create/edit forms)
- `lib/` — `supabase.js` (client), `theme.js` (theme + i18n context), `useRealtime.js` (realtime hook)
- `web/` — static PWA template (`index.html`, `manifest.json`) copied into `dist/` by `expo export` and then patched by `postexport.js`
