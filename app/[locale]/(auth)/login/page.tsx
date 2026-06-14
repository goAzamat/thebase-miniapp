/**
 * app/[locale]/(auth)/login/page.tsx
 * -------------------------------------------------------------
 * Server wrapper for the login screen. The interactive form uses
 * useSearchParams(), which must sit inside a <Suspense> boundary or
 * `next build` fails when prerendering this static route.
 */
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#161210]" />}>
      <LoginForm />
    </Suspense>
  );
}
