# Joshua Tree Reports v2

Version 2.0 of the Joshua Tree reporting app, built with Next.js, Supabase, and Vercel. Uses Google Drive and Gmail via OAuth (same Workspace account).

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` via the SQL Editor (in order: 001, 002, 003)
3. Enable Google Auth in Authentication > Providers
4. Copy the project URL and anon key

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` - OAuth credentials for Drive/Docs/Gmail
- `CRON_SECRET` - Random string for securing cron endpoints
- `VPR_MIGRATION_SHEET_ID` - (Optional) Google Sheet ID for one-time VPR migration

### 3. Google OAuth

Use the same OAuth app as the existing system (or create a new one in Google Cloud Console):

1. Create OAuth 2.0 credentials (Desktop app or Web)
2. Add `https://developers.google.com/oauthplayground` as redirect URI
3. Use OAuth Playground to get a refresh token with scopes: Drive, Docs, Sheets, Gmail
4. Configure `noreply@thejoshuatree.org` as "Send mail as" in Gmail

### 4. Admin Portal

1. Sign in with `bryan.evans@thejoshuatree.org` (you become Superadmin automatically)
2. Go to Admin Portal
3. Configure Drive folder IDs for each report type
4. Configure Google Doc template IDs
5. Add email recipients for Missing/Overdue reports
6. (Optional) Run VPR migration if migrating from existing sheet

### 5. Cron Jobs (cron-job.org)

Create three cron jobs:

| Job | URL | Schedule |
|-----|-----|----------|
| Missing Reports List | `https://your-app.vercel.app/api/cron/missing-reports?secret=YOUR_CRON_SECRET` | 7th of month, 8:00 AM ET |
| Overdue Reports | `https://your-app.vercel.app/api/cron/overdue-reports?secret=YOUR_CRON_SECRET` | 10th of month, 5:00 PM ET |
| VPR Cleanup | `https://your-app.vercel.app/api/cron/vpr-cleanup?secret=YOUR_CRON_SECRET` | Daily (e.g. 2:00 AM ET) |

## Deploy to Vercel

1. Push to GitHub and connect to Vercel
2. Add all environment variables in Vercel project settings
3. Deploy

## Report Types

- **SE Monthly Reports** (GVRA) - Supported Employment monthly reports with recall
- **Vocational Progress Reports** (VPR) - Progress reports by service stage
- **JTSG Vocational Monthly Reports** - JTSG-specific monthly reports
- **Employment Verification Form** (EVF) - Employment verification
- **JTSG Time Sheet** - Under maintenance

## Supported Employment Stages (trigger Missing/Overdue check)

- Job Development
- Training / OS 1
- Training / OS 2
- Stabilization / ES
