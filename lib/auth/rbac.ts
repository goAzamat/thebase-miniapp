/**
 * lib/auth/rbac.ts
 * -------------------------------------------------------------
 * Role-Based Access Control: the single source of truth for
 *   - which app roles exist,
 *   - which roles may open which module,
 *   - how Odoo security groups map to app roles.
 *
 * PURE LOGIC ONLY — no Next.js / Node imports, so it is safe to use from
 * the Edge middleware, Server Components, and API routes alike.
 */

export type AppRole =
  | 'admin'
  | 'rd'
  | 'sales'
  | 'supply'
  | 'finance'
  | 'production'
  | 'hr';

export type ModuleSlug =
  | 'lab'
  | 'sales'
  | 'supply-chain'
  | 'finance'
  | 'production'
  | 'hr'
  | 'admin';

/**
 * Role → module matrix. `admin` is added to every module so administrators
 * can see everything. Keep this in sync with config/modules.ts (which adds
 * presentation metadata: icon, path, i18n key).
 */
export const MODULE_ROLES: Record<ModuleSlug, AppRole[]> = {
  lab: ['rd', 'admin'],
  sales: ['sales', 'admin'],
  'supply-chain': ['supply', 'admin'],
  finance: ['finance', 'admin'],
  production: ['production', 'admin'],
  hr: ['hr', 'admin'],
  admin: ['admin'],
};

/** Ordered list used to pick a user's landing module after login. */
const MODULE_ORDER: ModuleSlug[] = [
  'lab',
  'sales',
  'supply-chain',
  'finance',
  'production',
  'hr',
  'admin',
];

/**
 * Odoo security group `full_name` → app role.
 * RECOMMENDED: create dedicated portal groups in Odoo (Settings → Users →
 * Groups) so the mapping is explicit and not guessed from functional groups.
 */
export const ODOO_GROUP_TO_ROLE: Record<string, AppRole> = {
  'THE BASE Portal / Administrator': 'admin',
  'THE BASE Portal / R&D': 'rd',
  'THE BASE Portal / Sales': 'sales',
  'THE BASE Portal / Supply Chain': 'supply',
  'THE BASE Portal / Finance': 'finance',
  'THE BASE Portal / Production': 'production',
  'THE BASE Portal / HR': 'hr',
};

/** Map a user's Odoo groups to a deduplicated set of app roles. */
export function mapGroupsToRoles(groups: string[]): AppRole[] {
  const roles = new Set<AppRole>();
  for (const g of groups) {
    const role = ODOO_GROUP_TO_ROLE[g];
    if (role) roles.add(role);
  }
  return [...roles];
}

/** Can these roles open this module? */
export function can(roles: AppRole[] | undefined, slug: ModuleSlug): boolean {
  if (!roles?.length) return false;
  return MODULE_ROLES[slug]?.some((r) => roles.includes(r)) ?? false;
}

/** First module a user is allowed to see — their post-login landing page. */
export function defaultModuleFor(roles: AppRole[] | undefined): ModuleSlug | null {
  if (!roles?.length) return null;
  return MODULE_ORDER.find((slug) => can(roles, slug)) ?? null;
}

/** Extract the module slug from a locale-stripped pathname, e.g. "/lab/briefs" → "lab". */
export function moduleFromPath(pathWithoutLocale: string): ModuleSlug | null {
  const seg = pathWithoutLocale.split('/').filter(Boolean)[0];
  return seg && seg in MODULE_ROLES ? (seg as ModuleSlug) : null;
}

/** Thrown by the pure guard; the RSC/layout wrapper turns it into forbidden()/redirect(). */
export class AccessDeniedError extends Error {
  constructor(readonly slug: ModuleSlug) {
    super(`Access denied to module "${slug}"`);
    this.name = 'AccessDeniedError';
  }
}

/**
 * Pure assertion (no framework coupling). Server layouts call this and, on
 * throw, invoke next/navigation `forbidden()`:
 *
 *   // app/(dashboard)/lab/layout.tsx
 *   const session = await auth();
 *   if (!can(session?.user.roles, 'lab')) forbidden();
 */
export function assertAccess(roles: AppRole[] | undefined, slug: ModuleSlug): void {
  if (!can(roles, slug)) throw new AccessDeniedError(slug);
}
