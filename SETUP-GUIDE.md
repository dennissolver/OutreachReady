# OutreachReady - Setup Guide

## 1. SUPABASE SETUP

### Create Project
1. Go to supabase.com → New Project
2. Name: `outreach-ready`
3. Generate password, save it
4. Choose region

### Run Migrations
Go to SQL Editor, run in order:
1. `supabase/migrations/001_create_tables.sql`
2. `supabase/migrations/002_create_rls_policies.sql`
3. `supabase/migrations/003_create_functions.sql`

### Auth URLs
Go to Authentication → URL Configuration:

**Site URL:**
```
https://outreach-ready-[SUFFIX].vercel.app
```

**Redirect URLs:**
```
https://outreach-ready-[SUFFIX].vercel.app/**
http://localhost:3000/**
```

---

## 2. VERCEL ENVIRONMENT VARIABLES

Add these in Vercel → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Settings → API |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | From ElevenLabs agent |
| `ELEVENLABS_API_KEY` | From ElevenLabs Profile |
| `OPENAI_API_KEY` | `sk-...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

---

## 3. STRIPE WEBHOOK

**Endpoint URL:**
```
https://outreach-ready-[SUFFIX].vercel.app/api/stripe/webhook
```

**Events:**
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

---

## 4. ELEVENLABS AGENT

1. Create Conversational AI Agent
2. Paste `elevenlabs-agent-prompt.md` as system prompt
3. Add tools with webhook: `https://outreach-ready-[SUFFIX].vercel.app/api/voice`

---

## 5. LOCAL DEV

```bash
npm install
cp .env.example .env.local
# Fill in values
npm run dev
```

---

## URL REFERENCE

| Service | URL |
|---------|-----|
| App | `https://outreach-ready-[SUFFIX].vercel.app` |
| Auth Callback | `.../auth/callback` |
| Stripe Webhook | `.../api/stripe/webhook` |
| Voice Webhook | `.../api/voice` |
