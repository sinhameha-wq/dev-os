# ContractIQ — Security Plan

**Date:** October 6, 2026  
**Version:** 1.0  
**Status:** Implemented

---

## Issues Found & Fixed

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | 🔴 Critical | **Storage path bug** — upload route used `contracts/{user_id}/...` inside the `contracts` bucket; `(storage.foldername(name))[1]` evaluated to `"contracts"` not the user UUID, so all storage RLS policies silently failed | Changed path to `{user_id}/{contract_id}/{filename}` in `upload/route.ts` |
| 2 | 🔴 Critical | **No prompt injection protection** — chat messages forwarded to GPT-4o with no sanitization | Created `lib/security/promptInjectionGuard.ts`; injected into chat POST route before OpenAI call |
| 3 | 🟠 High | **No rate limiting** — any authenticated user could spam processing (expensive GPT-4o calls) and chat | Created `lib/security/rateLimiter.ts` (Supabase sliding window) + `supabase/rls-policies.sql` (`rate_limit_events` table); applied to upload, process, and chat routes |
| 4 | 🟠 High | **No Zod input validation** — request bodies validated with manual `typeof` checks | Created `lib/security/inputValidator.ts` with Zod schemas for all routes; `parseBody()` helper returns a ready-to-return 422 on failure |
| 5 | 🟠 High | **Client-side sign-out** — `AppNav` called `supabase.auth.signOut()` in the browser; SSR cookies not cleared | Created `app/api/auth/logout/route.ts`; `AppNav` now POSTs to `/api/auth/logout` |
| 6 | 🟠 High | **Chat on non-complete contracts** — no status check; users could chat with pending/error contracts | Created `lib/security/chatSecurity.ts`; `verifyContractForChat()` enforces `status = 'complete'` |
| 7 | 🟠 High | **Internal error details leaked** — raw exception message from OpenAI included in 503 responses | Removed exception propagation; all 503s return a generic user-facing string |
| 8 | 🟡 Medium | **No `middleware.ts`** — auth pages didn't redirect authenticated users; route protection relied solely on server layouts | Created `middleware.ts`; protects `/dashboard`, `/contracts`; redirects authenticated users away from `/login`, `/signup` |
| 9 | 🟡 Medium | **No file extension validation** — only MIME type checked (spoofable) | `validateFileUpload()` in `inputValidator.ts` checks extension blocklist → allowlist → MIME type → size in order |
| 10 | 🟡 Medium | **`fileName` not sanitized** — raw user-supplied filename written to Storage path and DB | `uploadBodySchema` transforms fileName with `path.basename()` + character allowlist |
| 11 | 🟡 Medium | **No server-side auth routes** | Created `app/api/auth/login/route.ts` and `app/api/auth/logout/route.ts` |
| 12 | 🟢 Low | **`MAX_CHAT_HISTORY` hard-coded** — 200 in multiple places | Added `TOKEN_LIMITS.MAX_CHAT_HISTORY` in `tokenLimiter.ts`; driven by `MAX_CHAT_HISTORY` env var (default 100) |
| 13 | 🟢 Low | **Real credentials in `.env.example`** — file is committed to git | Replaced all values with empty placeholders |

---

## Files Created

| File | Purpose |
|---|---|
| `middleware.ts` | Next.js edge middleware — session refresh + route protection + auth redirect |
| `lib/security/authGuard.ts` | `requireAuth()` — verifies session via `getUser()`, returns user+client or 401 |
| `lib/security/rateLimiter.ts` | Sliding-window rate limiter backed by `rate_limit_events` table |
| `lib/security/promptInjectionGuard.ts` | `sanitizeForLLM()` — 20 regex patterns covering instruction override, system prompt extraction, persona hijacking, jailbreak keywords |
| `lib/security/tokenLimiter.ts` | Centralised limits: file size (10 MB), pages (20), contract tokens (15k), message length (5k), chat history (configurable) |
| `lib/security/chatSecurity.ts` | `verifyContractForChat()` + `upsertChatSession()` — contract ownership + status gate |
| `lib/security/inputValidator.ts` | Zod schemas for all API routes + `validateFileUpload()` + `parseBody()` helper |
| `app/api/auth/login/route.ts` | Server-side login — sets SSR cookies correctly |
| `app/api/auth/logout/route.ts` | Server-side logout — clears SSR session |
| `supabase/rls-policies.sql` | `rate_limit_events` table + index + RLS enable; storage bucket hardening |
| `docs/security/security-plan.md` | This file |

## Files Modified

| File | Change |
|---|---|
| `app/api/contracts/upload/route.ts` | Fixed storage path; added extension validation; Zod; rate limit |
| `app/api/contracts/[id]/process/route.ts` | Added rate limit; Zod; removed error detail leak |
| `app/api/contracts/[id]/chat/route.ts` | Added injection guard; rate limit; status gate; removed error detail leak; configurable history limit |
| `components/layout/AppNav.tsx` | Sign-out now POSTs to `/api/auth/logout` instead of calling Supabase client directly |
| `.env.example` | Cleared real credentials; added `MAX_CHAT_HISTORY` |
| `.env.local` | Added `MAX_CHAT_HISTORY=100` |

---

## Rate Limits

| Endpoint | Limit | Window | Table action value |
|---|---|---|---|
| `POST /api/auth/login` | 10 | 1 minute | `auth` |
| `POST /api/contracts/upload` | 20 | 24 hours | `upload` |
| `POST /api/contracts/[id]/process` | 5 | 1 hour | `process` |
| `POST /api/contracts/[id]/chat` | 30 | 1 minute | `chat` |

Rate limit exceeded → `429 Too Many Requests` with `Retry-After` header.

---

## SQL to Run in Supabase

Run `supabase/rls-policies.sql` in the Supabase SQL Editor **after** `database.sql`.

This creates:
- `rate_limit_events` table (with covering index + RLS enabled)
- Updates the `contracts` storage bucket with `file_size_limit` and `allowed_mime_types`

---

## Environment Variables Added

| Variable | File | Value |
|---|---|---|
| `MAX_CHAT_HISTORY` | `.env.local` | `100` |

---

## Outstanding Items (pre-launch)

- [ ] Run `supabase/rls-policies.sql` to create `rate_limit_events` table
- [ ] Cross-user RLS test: verify User B cannot read User A's data
- [ ] Storage RLS test: verify User B cannot access User A's signed URL
- [ ] Verify no `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in client bundles (`grep -r "sk-" .next/static`)
- [ ] Enable email confirmation in Supabase Auth settings before public launch
- [ ] Enable password reset flow in Supabase Auth
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain in deployment env vars
- [ ] Add `OPENAI_API_KEY` to `.env.local` (currently empty)
