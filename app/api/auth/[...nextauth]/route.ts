/**
 * app/api/auth/[...nextauth]/route.ts
 * -------------------------------------------------------------
 * Auth.js (NextAuth v5) catch-all route handler. Exposes GET/POST for
 * sign-in, sign-out, session, callback, csrf, etc.
 *
 * Pinned to the Node.js runtime because the Credentials authorize() in
 * lib/auth/config.ts talks to Odoo over XML-RPC (a Node-only library).
 */
import { handlers } from '@/lib/auth/config';

export const runtime = 'nodejs';

export const { GET, POST } = handlers;
