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
 * OPTIONAL dedicated portal groups (`res.groups.full_name`) → app role.
 * If you ever create explicit "THE BASE Portal / ..." groups in Odoo, they
 * take effect automatically. Most installs instead rely on the standard Odoo
 * app groups handled by `ODOO_PRIVILEGE_TO_ROLE` below.
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

/**
 * Standard Odoo app access → app role, keyed by the "privilege" prefix of a
 * group's `full_name`. In Odoo 19 a group's full_name is "Privilege / Name"
 * (e.g. "Sales / Administrator" → privilege "Sales"). This lets normal Odoo
 * users reach the right module without creating any dedicated portal groups.
 */
export const ODOO_PRIVILEGE_TO_ROLE: Record<string, AppRole> = {
  Sales: 'sales',
  'Point of Sale': 'sales',
  CRM: 'sales',

  Inventory: 'supply',
  Purchase: 'supply',

  Accounting: 'finance',
  Invoicing: 'finance',
  Expenses: 'finance',

  Manufacturing: 'production',
  Quality: 'production',
  Planning: 'production',
  Maintenance: 'production',

  'RD Management': 'rd',
  Project: 'rd',

  Employees: 'hr',
  Payroll: 'hr',
  Recruitment: 'hr',
  'Time Off': 'hr',
  Attendances: 'hr',
  Appraisals: 'hr',
};

/**
 * Odoo groups (matched by full `full_name` OR by privilege prefix) that grant
 * the portal `admin` role. `Access Rights` is Odoo's ERP-manager group, held by
 * administrators/owners.
 */
const ODOO_ADMIN_GROUPS = new Set<string>([
  'Access Rights',
  'Settings',
  'Administration',
]);

/** The privilege prefix of an Odoo full_name, e.g. "Sales / Administrator" → "Sales". */
function privilegeOf(fullName: string): string {
  return fullName.split('/')[0]?.trim() ?? '';
}

/** Map a user's Odoo groups to a deduplicated set of app roles. */
export function mapGroupsToRoles(groups: string[]): AppRole[] {
  const roles = new Set<AppRole>();
  for (const full of groups) {
    // 1) Dedicated portal groups (exact full_name match), if any exist.
    const exact = ODOO_GROUP_TO_ROLE[full];
    if (exact) roles.add(exact);

    // 2) Standard Odoo app groups, mapped by their privilege prefix.
    const privilege = privilegeOf(full);
    const byPrivilege = ODOO_PRIVILEGE_TO_ROLE[privilege];
    if (byPrivilege) roles.add(byPrivilege);

    // 3) Odoo administrators get full portal access.
    if (ODOO_ADMIN_GROUPS.has(full) || ODOO_ADMIN_GROUPS.has(privilege)) {
      roles.add('admin');
    }
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
