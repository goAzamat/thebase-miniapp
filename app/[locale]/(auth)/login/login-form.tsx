'use client';
/**
 * app/[locale]/(auth)/login/login-form.tsx
 * -------------------------------------------------------------
 * The interactive login form (client). Split out of page.tsx so the page can
 * wrap it in a <Suspense> boundary — required because useSearchParams() would
 * otherwise break static prerendering in `next build`.
 */
import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn('odoo', { login: email, password, redirect: false });

    if (!res || res.error) {
      setError(t('error'));
      setLoading(false);
      return;
    }

    const callbackUrl = searchParams.get('callbackUrl') ?? `/${locale}`;
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#161210] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#b8804f] opacity-20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-[22rem] w-[22rem] rounded-full bg-[#5a3d28] opacity-30 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl tracking-[0.3em] text-[#f3ece2]">
            THE <span className="text-[#c79161]">BASE</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-[#9a8a78]">
            {t('subtitle')}
          </p>
        </div>

        <div className="rounded-2xl border border-[#352a20] bg-[#211a14]/80 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-6 font-serif text-xl text-[#f3ece2]">{t('title')}</h2>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 rounded-lg border border-[#7a3a2d] bg-[#3a201a] px-3 py-2.5 text-sm text-[#f0b9ab]"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#b6a895]">{t('email')}</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6e60]" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full rounded-lg border border-[#3a2f25] bg-[#1a140f] py-2.5 pe-3 ps-10 text-sm text-[#f3ece2] placeholder-[#6f6354] outline-none transition focus:border-[#c79161] focus:ring-2 focus:ring-[#c79161]/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#b6a895]">{t('password')}</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6e60]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className="w-full rounded-lg border border-[#3a2f25] bg-[#1a140f] py-2.5 pe-10 ps-10 text-sm text-[#f3ece2] placeholder-[#6f6354] outline-none transition focus:border-[#c79161] focus:ring-2 focus:ring-[#c79161]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#7a6e60] transition hover:text-[#c79161]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c79161] py-2.5 text-sm font-semibold text-[#1a130c] transition hover:bg-[#d6a273] focus:ring-2 focus:ring-[#c79161]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('signingIn')}
                </>
              ) : (
                t('signIn')
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#7a6e60]">{t('footer')}</p>
      </div>
    </main>
  );
}
