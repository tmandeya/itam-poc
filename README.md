# ITAM — Multi-Site IT Asset Management System

> **POC Stack:** GitHub · Supabase · Vercel

A comprehensive IT Asset Management system supporting 8 sites (MM, ATL, AVN, CHD, HRE, PSE, PLD, WLD) with role-based access control, full asset lifecycle management, real-time dashboards, and automated workflows.

---

## 🚀 Quick Start (Day 1 Setup)

### Prerequisites
- [Node.js 20+](https://nodejs.org)
- [Git](https://git-scm.com)
- A [Supabase](https://supabase.com) account (free)
- A [Vercel](https://vercel.com) account (free)
- A [GitHub](https://github.com) account

---

### Step 1: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Choose your organisation (or create one)
4. Set:
   - **Name:** `itam-poc`
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your primary users
5. Click **"Create new project"** — wait ~2 minutes for provisioning
6. Once ready, go to **Settings → API** and copy:
   - `Project URL` (e.g., `https://xxxx.supabase.co`)
   - `anon public` key
   - `service_role` key (keep this secret!)

### Step 2: Deploy Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the contents of `supabase/migrations/001_schema.sql`
4. Click **"Run"** — wait for all tables to be created
5. Create another new query
6. Paste the contents of `supabase/migrations/002_rls_policies.sql`
7. Click **"Run"** — this enables Row Level Security
8. Create one more query
9. Paste the contents of `supabase/seed.sql`
10. Click **"Run"** — this populates 8 sites, reference data, and 50 sample assets

### Step 3: Create Your Admin User

1. In Supabase dashboard, go to **Authentication → Users**
2. Click **"Add user" → "Create new user"**
3. Enter your email and a password
4. After the user is created, go to **SQL Editor** and run:

```sql
-- Replace 'YOUR_USER_ID' with the UUID from the Auth > Users table
-- Replace the email with the one you used
UPDATE public.profiles
SET role = 'super_admin', full_name = 'Admin User'
WHERE email = 'your-email@company.com';

-- Assign all sites to the admin
INSERT INTO public.user_site_assignments (user_id, site_id)
SELECT p.id, s.id
FROM public.profiles p
CROSS JOIN public.sites s
WHERE p.email = 'your-email@company.com';
```

### Step 4: Push to GitHub

```bash
# Clone or initialise repo
git init
git add .
git commit -m "Initial ITAM POC setup"

# Create GitHub repo (via github.com or GitHub CLI)
gh repo create itam-poc --private --source=. --push
# OR
git remote add origin https://github.com/YOUR_ORG/itam-poc.git
git push -u origin main
```

### Step 5: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → select `itam-poc`
3. Set **Framework Preset** to `Next.js`
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
5. Click **"Deploy"** — Vercel builds and deploys in ~60 seconds
6. Your ITAM system is now live at `https://itam-poc.vercel.app`!

### Step 6: Local Development

```bash
# Install dependencies
npm install

# Copy env template and fill in your Supabase keys
cp .env.example .env.local
# Edit .env.local with your Supabase project URL and keys

# Start dev server
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
itam-poc/
├── app/
│   ├── auth/login/          # Login page
│   ├── (dashboard)/         # Protected dashboard layout
│   │   ├── page.tsx         # Dashboard with KPIs & charts
│   │   ├── assets/          # Asset register (CRUD)
│   │   ├── transfers/       # Transfer workflow
│   │   ├── repairs/         # Repair loop
│   │   ├── disposal/        # Disposal workflow
│   │   ├── users/           # User management (admin)
│   │   ├── audit/           # Audit log
│   │   └── reports/         # Export reports
│   ├── globals.css          # Dark theme styles
│   └── layout.tsx           # Root layout
├── lib/supabase/            # Supabase client/server helpers
├── types/                   # TypeScript type definitions
├── supabase/
│   ├── migrations/          # SQL schema + RLS policies
│   └── seed.sql             # Sample data for 8 sites
├── middleware.ts             # Auth protection
└── .github/workflows/       # CI pipeline
```

## 🔐 Role-Based Access Control

| Role | Scope | Permissions |
|------|-------|-------------|
| **Super Admin** | All sites | Full CRUD, user management, disposals, global config |
| **Site Admin** | Assigned sites | Full CRUD within their sites, initiate transfers |
| **IT Staff** | Assigned sites | View + update status/notes within their sites |

RBAC is enforced at the **database level** via PostgreSQL Row Level Security — not in application code.

## 🗃️ Database Schema

20+ tables across 9 logical groups: Organisation, Users & RBAC, Asset Register, Lifecycle (Transfers, Repairs, Disposals), Financial, Documents, Software Licenses, Maintenance, and Audit Log.

Key features:
- Auto-generated asset tags (`TAG-2025-0001`) via PostgreSQL trigger
- Native `MACADDR` and `INET` types for network fields
- Straight-line depreciation function
- Immutable audit log with trigger-based capture
- Realtime broadcast on all asset changes

---

## 📋 License

Internal use only. Proprietary.
