/**
 * i18n/request.ts
 * -------------------------------------------------------------
 * next-intl server config: resolves the active locale per request and loads
 * the matching message catalog from /messages. Referenced by the next-intl
 * plugin in next.config.mjs and by getMessages()/getTranslations() in RSC.
 */
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
