# Wire user accounts into the app

## Current state (verified)

The backend is already the Lovable Cloud database (managed Supabase) — this is the same thing as "Supabase as the backend", so no migration to a different backend is needed.

- Email/password, Google and Apple sign-in are live on `/auth`.
- A `profiles` table exists and a database trigger automatically creates a profile row (email, full name, avatar) whenever anyone signs up — via email, Google or Apple.
- Checked the data: 1 user account, 1 matching profile row, 0 users missing a profile. Storage of logins is working.

The real gap is on the app side: **nothing in the app actually reads or shows the signed-in user.** The app shell shows hardcoded initials "AM", there is no sign-out, no account screen, and `/app/*` pages are reachable without signing in.

## What to build

1. **Auth hook** (`src/hooks/useAuth.tsx`)
   - Provider that subscribes to auth state changes, exposes `user`, `profile`, `loading`, and `signOut`.
   - Loads the user's profile row on sign-in; mounted once in the root route.

2. **Real user in the app shell** (`src/routes/app.tsx`)
   - Replace the hardcoded "AM" avatar with the user's real avatar image or initials from their profile.
   - Add a dropdown with name, email, "Account settings" and "Sign out".

3. **Account page** (`src/routes/app.account.tsx`)
   - Shows email and sign-in method; lets the user edit full name and avatar URL, saved back to their profile row.

4. **Protect the app area**
   - Signed-out visitors hitting `/app/*`, `/discover` or `/verify` get sent to `/auth`, then returned to where they were heading after signing in.

5. **Profile safety net**
   - On sign-in, if a profile row is somehow missing, create it from the account details so no signed-in user is ever profile-less.

## Technical notes

- Follows the existing pattern: browser Supabase client for session/profile reads, existing RLS ("users can view/update own profile") already covers this — no schema change or migration required.
- Protected pages move under a `_authenticated` layout so the guard is defined once rather than per page; the public marketing pages, pricing and `/auth` stay public and server-rendered.
- Sign-out clears the cached query data to avoid stale user data leaking between accounts.
