# SkillSwap V2

A peer-to-peer skill-exchange platform. Users teach what they know and learn what they want — no money, just skill-for-skill barter.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Plain HTML + Vanilla JS (ES modules) + Tailwind CSS CDN |
| Backend | Supabase (Postgres, Auth, Realtime, Storage) |
| Hosting | Netlify / Vercel (static) |

## Project Structure

```
/
├── index.html          Welcome / onboarding splash
├── login.html          Email + password login
├── register.html       Sign up
├── forgot.html         Password reset request
├── reset.html          Set new password
├── home.html           Dashboard / matched suggestions
├── search.html         Browse & filter listings
├── listings.html       All listings index
├── listing.html        Single listing detail + Join
├── create.html         Post a "teach" listing
├── request.html        Post a "learn" request
├── onboarding.html     First-login skill-picker
├── profile.html        Own profile / public profile
├── chat.html           Realtime 1-to-1 messaging
├── notifications.html  Notification inbox
├── /js                 Vanilla JS modules
├── /css/app.css        Custom utility CSS
└── /supabase           SQL migrations
```

## Quick Start (Local Dev)

1. **Clone** the repo.
2. **Create Supabase project** at [supabase.com](https://supabase.com).
3. **Run migrations** in the Supabase SQL editor (in order):
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_functions.sql`
   - `supabase/migrations/004_triggers.sql`
   - `supabase/migrations/005_seed.sql`
4. **Create Storage buckets**:
   - `avatars` — public read
   - `attachments` — private
5. **Configure env**: copy `.env.example` → `.env`, fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
6. **Inject env into pages**: Add a `<script>` block in each HTML `<head>` (done via build step or manually for local dev):
   ```html
   <script>
     window.SUPABASE_URL = 'https://YOUR-REF.supabase.co';
     window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   </script>
   ```
   A `config.js` file is auto-generated with those values, included via `<script src="/js/config.js">` in each page.
7. **Serve locally**: use any static server, e.g.:
   ```bash
   npx serve .
   # or
   python3 -m http.server 3000
   ```

## Deploy to Netlify

1. Push repo to GitHub.
2. Connect repo in Netlify → **New site from Git**.
3. Build command: *(leave blank — it's a static site)*
4. Publish directory: `.` (root)
5. Set environment variables in Netlify UI:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
6. Add a `netlify.toml` build plugin (included in this repo) that writes `js/config.js` from env vars.

## Deploy to Vercel

1. Push to GitHub.
2. Import project in Vercel.
3. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Vercel will serve static files automatically.
5. A `vercel.json` rewrites file is included.

## Supabase Storage Buckets

| Bucket | Policy |
|--------|--------|
| `avatars` | Public read; authenticated write scoped to own user folder |
| `attachments` | Private; authenticated users generate signed URLs |

## Auth Flow

```
index.html → register.html → onboarding.html → home.html
index.html → login.html → home.html
```

All pages except `index.html`, `login.html`, `register.html`, `forgot.html`, `reset.html` are protected by `js/auth-guard.js` which redirects to `/login.html` if no active Supabase session exists.

## Database Migrations

Run in this order in Supabase SQL Editor (or via Supabase CLI):

| File | Contents |
|------|----------|
| `001_schema.sql` | All tables, indexes, constraints |
| `002_rls.sql` | Row Level Security policies |
| `003_functions.sql` | `find_matches()`, `is_match_member()`, `accept_match_request()` |
| `004_triggers.sql` | Profile auto-create, review aggregate, notification triggers |
| `005_seed.sql` | Categories + starter skills |
