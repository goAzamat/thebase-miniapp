/**
 * config/modules.ts
 * -------------------------------------------------------------
 * MODULE REGISTRY — presentation metadata for each department dashboard.
 * The access rules (which roles may enter) live in lib/auth/rbac.ts; this
 * file only adds the route, the i18n label key and the sidebar icon.
 *
 * Adding a new department = append one entry here (+ a route folder +
 * a features/<slug> folder + an rbac entry). Nothing else changes.
 */
import {
  FlaskConical,
  TrendingUp,
  Truck,
  Wallet,
  Factory,
  Users,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleSlug } from '@/lib/auth/rbac';

export interface ModuleDef {
  slug: ModuleSlug;
  path: string; // locale-agnostic (next-intl <Link> adds the prefix)
  labelKey: string; // resolves to nav.<labelKey> in /messages
  icon: LucideIcon;
}

export const MODULES: ModuleDef[] = [
  { slug: 'lab', path: '/lab', labelKey: 'lab', icon: FlaskConical },
  { slug: 'sales', path: '/sales', labelKey: 'sales', icon: TrendingUp },
  { slug: 'supply-chain', path: '/supply-chain', labelKey: 'supplyChain', icon: Truck },
  { slug: 'finance', path: '/finance', labelKey: 'finance', icon: Wallet },
  { slug: 'production', path: '/production', labelKey: 'production', icon: Factory },
  { slug: 'hr', path: '/hr', labelKey: 'hr', icon: Users },
  { slug: 'admin', path: '/admin', labelKey: 'admin', icon: Shield },
];
