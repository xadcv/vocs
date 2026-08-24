import type { MiddlewareHandler } from 'hono'
import * as Config from '../../../internal/config.js'
import * as I18n from '../../../internal/i18n.js'
import { appendSearch } from '../../../internal/redirects.js'

const normalizeBasePath = (basePath: string) => (basePath.endsWith('/') ? basePath : `${basePath}/`)

/**
 * Handles locale-prefixed routing for internationalized documentation sites.
 *
 * - Redirects `/` to the default locale home when i18n is enabled.
 * - With `hideLocale: 'default-locale'`, rewrites unprefixed paths to the
 *   default locale internally and redirects prefixed default-locale URLs to
 *   their canonical unprefixed form.
 */
export const i18n = (options: i18n.Options = {}): MiddlewareHandler => {
  const optionsPromise =
    options.basePath !== undefined || options.i18n !== undefined
      ? Promise.resolve({
          basePath: normalizeBasePath(options.basePath ?? '/'),
          i18n: options.i18n,
        })
      : Config.resolve({ server: true }).then((config) => ({
          basePath: normalizeBasePath(config.basePath),
          i18n: config.i18n,
        }))

  return async (context, next) => {
    const { basePath, i18n: i18nConfig } = await optionsPromise
    if (!i18nConfig) return next()

    const url = new URL(context.req.url)
    const pathname = stripBasePath(url.pathname, basePath)
    if (I18n.shouldSkipI18n(pathname)) return next()

    const locale = I18n.parseLocale(pathname, i18nConfig)
    const hideDefault = i18nConfig.hideLocale === 'default-locale'

    if (pathname === '/') {
      if (hideDefault) {
        return rewriteRequest(
          context,
          url,
          joinBasePath(basePath, `/${i18nConfig.defaultLocale}`),
          next,
        )
      }

      if (!i18nConfig.redirectRoot) return next()

      const destination = appendSearch(
        joinBasePath(basePath, `/${i18nConfig.defaultLocale}`),
        url.search,
      )
      context.res = context.redirect(destination, 302)
      return
    }

    if (hideDefault) {
      if (locale === i18nConfig.defaultLocale) {
        const canonical = appendSearch(
          joinBasePath(basePath, I18n.stripLocale(pathname, i18nConfig)),
          url.search,
        )
        context.res = context.redirect(canonical, 308)
        return
      }

      if (!locale) {
        const rewritten = joinBasePath(
          basePath,
          `/${i18nConfig.defaultLocale}${pathname === '/' ? '' : pathname}`,
        )
        return rewriteRequest(context, url, rewritten, next)
      }
    }

    return next()
  }
}

export default i18n

export declare namespace i18n {
  type Options = {
    basePath?: string | undefined
    i18n?: I18n.I18nConfig | undefined
  }
}

function stripBasePath(pathname: string, basePath: string): string {
  if (basePath === '/') return pathname || '/'
  if (pathname === basePath.slice(0, -1)) return '/'
  if (pathname.startsWith(basePath)) return pathname.slice(basePath.length - 1) || '/'
  return pathname
}

function joinBasePath(basePath: string, pathname: string): string {
  if (basePath === '/') return pathname
  if (pathname === '/') return basePath.slice(0, -1)
  return `${basePath.slice(0, -1)}${pathname}`
}

async function rewriteRequest(
  context: Parameters<MiddlewareHandler>[0],
  url: URL,
  pathname: string,
  next: Parameters<MiddlewareHandler>[1],
) {
  url.pathname = pathname
  context.req.raw = new Request(url, context.req.raw)
  return next()
}
