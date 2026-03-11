# Deploying Joshua Tree Reports v2 to Vercel

> **Important:** Never commit `.env.local` to Git. Add it to `.gitignore` if not already excluded.

## 1. Push to Git (if not already)

```bash
cd "c:\Users\bryan\Documents\Joshua Tree\New Reporting App 2026\joshua-tree-pwa"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub if your repo is there).
2. Click **Add New** → **Project**.
3. Import your repository.
4. **Important:** Set **Root Directory** to `v2` (the Next.js app lives in the v2 folder).
5. Framework Preset: Next.js (auto-detected).
6. Click **Deploy** (it will fail until env vars are set—that’s expected).

## 3. Environment Variables in Vercel

In your Vercel project: **Settings** → **Environment Variables**. Add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xkhybcyiyjmghzevgmgm.supabase.co` | From .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your anon key) | From .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | (your service role key) | From .env.local |
| `GOOGLE_OAUTH_CLIENT_ID` | (your client ID) | From .env.local |
| `GOOGLE_OAUTH_CLIENT_SECRET` | (your client secret) | From .env.local |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | (your refresh token) | From .env.local |
| `CRON_SECRET` | (random string) | Same as .env.local or generate new |
| `VPR_MIGRATION_SHEET_ID` | (optional) | Only if using VPR migration |

Apply to **Production**, **Preview**, and **Development** as needed.

## 4. Supabase Auth Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication** → **URL Configuration**.
3. Add to **Redirect URLs**:
   - `https://YOUR_VERCEL_APP.vercel.app/auth/callback`
   - `https://YOUR_CUSTOM_DOMAIN/auth/callback` (if using a custom domain)
4. Set **Site URL** to `https://YOUR_VERCEL_APP.vercel.app` (or your custom domain).

## 5. Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Open your OAuth 2.0 Client ID.
3. Under **Authorized redirect URIs**, add:
   - `https://xkhybcyiyjmghzevgmgm.supabase.co/auth/v1/callback`
   
   (Supabase handles the OAuth callback; this URI is usually already set. If you added a custom Supabase redirect, use that instead.)

## 6. Redeploy

After env vars and redirect URLs are set, trigger a new deployment:

- **Deployments** → **⋯** on latest deployment → **Redeploy**

Or push a new commit.

## 7. Cron Jobs (Missing Reports, Overdue, VPR Cleanup)

If you use cron-job.org or similar:

- **Missing Reports (7th):** `GET https://YOUR_APP.vercel.app/api/cron/missing-reports?secret=YOUR_CRON_SECRET`
- **Overdue Reports (10th):** `GET https://YOUR_APP.vercel.app/api/cron/overdue-reports?secret=YOUR_CRON_SECRET`
- **VPR Cleanup:** `GET https://YOUR_APP.vercel.app/api/cron/vpr-cleanup?secret=YOUR_CRON_SECRET`

Or send `Authorization: Bearer YOUR_CRON_SECRET` header.

## 8. Database Migrations

Ensure Supabase migrations are applied:

```bash
cd v2
npx supabase db push
```

Or run the SQL from `supabase/migrations/*.sql` in the Supabase SQL Editor.

## 9. Post-Deploy Checklist

- [ ] Sign in with a @thejoshuatree.org Google account
- [ ] Configure Drive folders and templates in Admin Portal
- [ ] Upload JTSG TSVS template PDF (if using)
- [ ] Add report notification recipients in Admin Portal
- [ ] Test one report submission per type
