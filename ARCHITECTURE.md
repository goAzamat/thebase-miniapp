# THE BASE — Headless ERP Portal · Architecture (STEP 1: Foundation)

> Next.js (App Router) + Tailwind + lucide-react + Recharts · React Query caching · `next-intl` (en default, ru/ar later) · Node XML-RPC middleware to Odoo · Vercel + GitHub.
> **No LLM / AI chat in the end-user app** — strictly a data dashboard + UI layer over Odoo.
> Design goal: build the **Core once**, then **copy-paste a module** to stand up each of the 7 department dashboards (Lab, Sales, Supply Chain, Finance, Production, HR, Admin).

---

## 1. Directory tree

```text
the-base-portal/
├─ app/
│  ├─ [locale]/                          # i18n root segment (en | ru | ar) — drives <html lang/dir>
│  │  ├─ layout.tsx                       # NextIntlClientProvider + ReactQueryProvider + ThemeProvider; sets dir=rtl for ar
│  │  ├─ page.tsx                         # "/" → redirect to user's default module (from session)
│  │  │
│  │  ├─ (auth)/                          # route group — unauthenticated shell (no sidebar)
│  │  │  ├─ layout.tsx
│  │  │  ├─ login/page.tsx
│  │  │  └─ forbidden/page.tsx            # 403 landing
│  │  │
│  │  └─ (dashboard)/                     # route group — authenticated shell (sidebar + topbar)
│  │     ├─ layout.tsx                    # SHARED CORE SHELL + server-side RBAC guard (auth() → assertAccess)
│  │     │
│  │     ├─ lab/                          # ── MODULE TEMPLATE (the one you copy-paste) ──
│  │     │  ├─ layout.tsx                 # assertAccess('lab'); module-local nav
│  │     │  ├─ page.tsx                   # Lab overview (KPIs)
│  │     │  ├─ briefs/page.tsx            # Client Briefs (project.project / project.task)
│  │     │  ├─ formulas/page.tsx          # Formula library (mrp.bom)
│  │     │  ├─ formulas/[id]/page.tsx     # Formula detail + cost breakdown
│  │     │  └─ stock/page.tsx             # Raw-material stock status
│  │     │
│  │     ├─ sales/                        # ← copy of /lab, swap feature import + RBAC role
│  │     ├─ supply-chain/
│  │     ├─ finance/
│  │     ├─ production/
│  │     ├─ hr/
│  │     └─ admin/                        # user↔role mapping, module registry, audit
│  │
│  ├─ api/                                # server-only HTTP boundary (XML-RPC lives behind here)
│  │  ├─ auth/[...nextauth]/route.ts      # Auth.js (NextAuth v5) handler
│  │  └─ odoo/
│  │     ├─ briefs/route.ts
│  │     ├─ formulas/route.ts
│  │     └─ stock/route.ts
│  │
│  ├─ robots.ts · sitemap.ts · globals.css
│  └─ favicon, opengraph, etc.
│
├─ middleware.ts                          # 1) next-intl locale  2) auth gate  3) RBAC route guard
│
├─ i18n/
│  ├─ routing.ts                          # defineRouting({ locales:['en','ru','ar'], defaultLocale:'en' })
│  ├─ request.ts                          # getRequestConfig — loads /messages/{locale}.json
│  └─ navigation.ts                       # locale-aware <Link>, useRouter, redirect
│
├─ messages/                              # i18n catalogs (namespaced per module + common)
│  ├─ en.json
│  ├─ ru.json
│  └─ ar.json
│
├─ components/
│  ├─ core/                               # design system — used by EVERY module, never department-specific
│  │  ├─ layout/ (AppShell, Sidebar, Topbar, ModuleNav, LocaleSwitcher)
│  │  ├─ data/   (DataTable, KpiCard, StatBadge, EmptyState, ErrorState, Skeletons)
│  │  ├─ charts/ (BarChart, LineChart, DonutChart — thin Recharts wrappers)
│  │  └─ ui/     (Button, Card, Dialog, Input, Select, Tabs, Badge — Tailwind primitives)
│  │
│  └─ modules/                            # PRESENTATION specific to one department
│     ├─ lab/    (BriefsTable, FormulaCostBreakdown, RawStockTable, FunctionalAddInBar)
│     ├─ sales/  …
│     └─ …
│
├─ features/                              # BUSINESS LOGIC per module (the brain; UI-agnostic)
│  ├─ lab/
│  │  ├─ server.ts                        # 'use server' actions OR plain server fns: getBriefs(), getFormula(id), getStock()
│  │  ├─ queries.ts                       # React Query hooks: useBriefs(), useFormula(id) + query-key factory
│  │  ├─ schema.ts                        # Zod schemas + TS types for Odoo payloads (validate at the boundary)
│  │  ├─ mappers.ts                       # raw Odoo records → clean view models (e.g. food-cost calc from the MVP)
│  │  └─ index.ts                         # public surface of the module
│  ├─ sales/ · supply-chain/ · finance/ · production/ · hr/ · admin/
│  └─ _template/                          # scaffold you literally copy to add a department
│
├─ lib/
│  ├─ odoo/                               # SERVER-ONLY (import 'server-only')
│  │  ├─ client.ts                        # XML-RPC connection pool (common + object endpoints)
│  │  ├─ auth.ts                          # authenticate(login,key) → uid; cached per session
│  │  ├─ execute.ts                       # execute_kw wrapper: searchRead/read/searchCount (typed, field-limited)
│  │  └─ cache.ts                         # shared server cache (Vercel KV / unstable_cache) in front of XML-RPC
│  ├─ auth/
│  │  ├─ config.ts                        # Auth.js config: Credentials provider → Odoo
│  │  ├─ rbac.ts                          # role↔module matrix + assertAccess()/can()
│  │  └─ session.ts                       # typed auth() helpers (server)
│  ├─ react-query/
│  │  ├─ provider.tsx                     # 'use client' QueryClientProvider + sane defaults
│  │  └─ get-query-client.ts              # server/client singleton for hydration
│  └─ utils/ (cn, formatters, env guards)
│
├─ config/
│  ├─ modules.ts                          # MODULE REGISTRY — single source of truth (see RBAC §2)
│  └─ site.ts
│
├─ types/                                 # global shared types
├─ env.mjs                                # @t3-oss/env-nextjs — validate ODOO_URL/DB/USER/KEY at build
├─ tailwind.config.ts · tsconfig.json (paths: @/*) · next.config.mjs (withNextIntl)
└─ .env.local · .env.example · README.md
```

### Why this shape scales by copy-paste
- **Three clean layers per department**: route (`app/(dashboard)/<mod>`) → presentation (`components/modules/<mod>`) → logic (`features/<mod>`). Adding a department = copy `features/_template` + one route folder, register it in `config/modules.ts`, add a `messages` namespace. Nothing in Core changes.
- **Core is dependency-free of modules** (modules import Core, never the reverse) — so the shared shell, tables, charts and auth evolve once for all 7.
- **XML-RPC is sealed behind `lib/odoo` + `app/api`** (`server-only`), so Odoo credentials and the ERP surface never ship to the browser.

---

## 2. RBAC — how a user is pinned to `/lab` or `/sales`

**Single source of truth — the module registry** (`config/modules.ts`):

```ts
export const MODULES = {
  lab:          { path: 'lab',          icon: FlaskConical, roles: ['rd', 'admin'] },
  sales:        { path: 'sales',        icon: TrendingUp,   roles: ['sales', 'admin'] },
  'supply-chain':{ path: 'supply-chain', icon: Truck,       roles: ['supply', 'admin'] },
  finance:      { path: 'finance',      icon: Wallet,       roles: ['finance', 'admin'] },
  production:   { path: 'production',   icon: Factory,      roles: ['production', 'admin'] },
  hr:           { path: 'hr',           icon: Users,        roles: ['hr', 'admin'] },
  admin:        { path: 'admin',        icon: Shield,       roles: ['admin'] },
} as const;
```

Every other layer (nav, middleware, layout guard, API) reads from this map, so access rules live in **one place**.

**Where roles come from — Odoo is the identity provider.** Using **Auth.js (NextAuth v5) Credentials provider**:
1. Login form → `signIn('credentials', { login, apiKey })`.
2. The provider calls Odoo `common.authenticate(db, login, key)` → `uid`. Reject if falsy.
3. Read `res.users[uid].groups_id`, map Odoo security groups → app roles (`rd`, `sales`, …) via a lookup. *(Recommended: create dedicated Odoo groups like `THE BASE Portal / R&D` so mapping is explicit, not guessed from functional groups.)*
4. Persist into the JWT/session: `{ uid, roles[], defaultModule, locale }`. **No Odoo password is stored** — keep the per-user API key server-side only, encrypted in the session cookie.

**Three enforcement layers (defense in depth — never trust one):**

1. **Middleware (`middleware.ts`) — the router gate.** Runs on every request, composes next-intl + auth:
   - next-intl resolves `[locale]`.
   - No session on a `(dashboard)` path → redirect to `/<locale>/login`.
   - Extract the module slug from the path, look it up in `MODULES`, intersect `session.roles` with `module.roles`. No overlap → redirect to the user's `defaultModule` (or `/forbidden`).
   - Cheap and central, but middleware alone is **not** a security boundary (it can be bypassed in edge cases) — hence layers 2–3.

2. **Server layout guard — the real boundary.** Each `app/(dashboard)/<mod>/layout.tsx` calls `await assertAccess('<mod>')` (which reads `auth()` server-side and throws `forbidden()` / `redirect()`). Because layouts are React Server Components, this runs on the server on every navigation and **cannot be skipped from the client**.

3. **Data boundary — re-check on every read.** Server actions / `app/api/odoo/*` re-assert the role before touching Odoo, and re-scope the query (e.g. Lab can read `mrp.bom`, not `account.move`). The UI is a convenience; the API is the wall.

**Navigation reflects access automatically:** `Sidebar` renders `Object.values(MODULES).filter(m => can(session.roles, m))` — a Sales user simply never sees the Lab link, and is bounced if they hand-type the URL.

---

## 3. Caching strategy — two layers so we never hammer Odoo

XML-RPC is slow and the ERP is the system of record we must protect. We cache in **two tiers**: a **shared server cache** (one Odoo hit serves all users) and a **per-client React Query cache** (instant UX, dedupe, background refresh).

### Tier A — Shared server cache (protects the ERP)
React Query is **per browser** — 50 users = 50 separate caches = 50× load on Odoo. So the real ERP shield sits server-side in `lib/odoo/cache.ts`, wrapping `execute_kw`:
- Wrap reads in `unstable_cache` (Next Data Cache) and/or **Vercel KV / Upstash Redis** with a TTL keyed by `model + domain + fields`.
- TTL by volatility: master data (`mrp.bom`, formulas) **5–15 min**; briefs/tasks **1–2 min**; stock **30–60 s**.
- **Cache tags** (`revalidateTag('odoo:mrp.bom')`) so a future write/webhook can surgically invalidate.
- Always **limit + select fields** (never `read` all columns) and paginate — keeps payloads small and Odoo fast. (Same lesson as the MVP: large responses must be chunked.)

### Tier B — React Query (client UX)
- All Odoo reads flow through `features/<mod>/queries.ts` with a **query-key factory** for safe invalidation:
  ```ts
  export const labKeys = {
    all: ['lab'] as const,
    briefs: (f?: BriefFilters) => [...labKeys.all, 'briefs', f] as const,
    formula: (id: number)     => [...labKeys.all, 'formula', id] as const,
    stock: (ids: number[])    => [...labKeys.all, 'stock', ids] as const,
  };
  ```
- **Per-query `staleTime` mirrors Tier-A TTLs** (formulas long, stock short) so the client doesn't refetch fresher than the server cache can offer.
- `gcTime` generous (e.g. 30 min); `refetchOnWindowFocus: false` for heavy lists; `placeholderData: keepPreviousData` for pagination/filtering (no flicker).
- **Server prefetch + hydration**: RSC prefetches the first view into a `dehydrate`d state passed to `HydrationBoundary` → fast first paint, no client waterfall.
- React Query auto-**dedupes in-flight identical requests** and shares one result across components on a page.
- **Mutations (later phases)**: optimistic update → on settle `invalidateQueries(labKeys.all)` **and** `revalidateTag` on the server so both tiers refresh.

**Net effect:** a department viewing formulas hits Odoo at most once per TTL window for the whole team; every other view is served from KV or the in-memory client cache. The ERP stays calm even as we scale to 7 departments.

---

## Notes & one decision to confirm
- **Auth provider**: I've specced **Auth.js v5 Credentials → Odoo** (roles from Odoo groups). The alternative is a custom JWT/session service. Auth.js is the faster, Vercel-native path and keeps everything in-app — recommended unless you already run a central IdP (Keycloak/Azure AD) you want SSO against.
- **Arabic / RTL** is handled at `app/[locale]/layout.tsx` (`dir = locale === 'ar' ? 'rtl' : 'ltr'`) — Tailwind logical properties (`ps-*`, `pe-*`) keep components RTL-safe from day one.
- **Continuity with the MVP**: the food-cost computation and the formula/BoM/stock reads we already validated drop straight into `features/lab/{mappers,server}.ts`.

### Suggested STEP 2
Auth foundation + live Odoo connection: `lib/odoo/{client,auth,execute}.ts`, `lib/auth/{config,rbac}.ts`, `middleware.ts`, the login route, and `assertAccess`. Once that's green, the Lab module is just wiring `features/lab` to the screens.
