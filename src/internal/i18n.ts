export type Locale = {
  code: string
  dir?: 'ltr' | 'rtl' | undefined
  label: string
  lang?: string | undefined
}

export type I18nConfig = {
  defaultLocale: string
  hideLocale: 'default-locale' | 'never'
  locales: readonly Locale[]
  redirectRoot: boolean
}

export type I18nOptions = {
  defaultLocale: string
  hideLocale?: 'default-locale' | 'never' | undefined
  locales: readonly Locale[]
  /**
   * Redirect `/` to the default locale home (e.g. `/en`).
   *
   * Disable when you want to keep a locale-neutral landing page alongside
   * locale-prefixed content.
   *
   * @default true
   */
  redirectRoot?: boolean | undefined
}

const localeCodePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

export function from(options: I18nOptions | undefined): I18nConfig | undefined {
  if (!options) return undefined

  const { defaultLocale, locales } = options
  if (!defaultLocale) throw new Error('i18n.defaultLocale is required when i18n is configured')
  if (!locales?.length) throw new Error('i18n.locales must contain at least one locale')

  const seen = new Set<string>()
  const seenLanguages = new Set<string>()
  const normalizedLocales = locales.map((locale) => {
    if (!locale.code) throw new Error('i18n.locales[].code is required')
    if (!localeCodePattern.test(locale.code)) {
      throw new Error(
        `i18n.locales[].code "${locale.code}" must be URL-safe (alphanumeric and hyphens only)`,
      )
    }
    if (seen.has(locale.code)) {
      throw new Error(`i18n.locales contains duplicate code "${locale.code}"`)
    }
    seen.add(locale.code)
    if (!locale.label) throw new Error(`i18n.locales[].label is required for "${locale.code}"`)
    const lang = locale.lang ?? locale.code
    try {
      Intl.getCanonicalLocales(lang)
    } catch {
      throw new Error(`i18n.locales[].lang "${lang}" is not a valid BCP 47 language tag`)
    }
    const normalizedLang = lang.toLowerCase()
    if (seenLanguages.has(normalizedLang)) {
      throw new Error(`i18n.locales contains duplicate language tag "${lang}"`)
    }
    seenLanguages.add(normalizedLang)
    return {
      code: locale.code,
      label: locale.label,
      lang,
      ...(locale.dir ? { dir: locale.dir } : {}),
    }
  })

  if (!seen.has(defaultLocale)) {
    throw new Error(`i18n.defaultLocale "${defaultLocale}" must be one of: ${[...seen].join(', ')}`)
  }

  return {
    defaultLocale,
    hideLocale: options.hideLocale ?? 'never',
    locales: normalizedLocales,
    redirectRoot: options.redirectRoot ?? true,
  }
}

export function parseLocale(path: string, config: I18nConfig | undefined): string | undefined {
  if (!config) return undefined
  const normalized = normalizePath(path)
  if (normalized === '/') return undefined

  const segment = normalized.slice(1).split('/')[0]
  if (!segment) return undefined

  return config.locales.some((locale) => locale.code === segment) ? segment : undefined
}

export function stripLocale(path: string, config: I18nConfig | undefined): string {
  if (!config) return normalizePath(path)

  const normalized = normalizePath(path)
  const locale = parseLocale(normalized, config)
  if (!locale) return normalized

  const stripped = normalized.slice(locale.length + 1) || '/'
  return stripped.startsWith('/') ? stripped : `/${stripped}`
}

export function localizePath(path: string, locale: string, config: I18nConfig | undefined): string {
  if (!config) return normalizePath(path)

  const logical = stripLocale(path, config)
  const hideDefault = config.hideLocale === 'default-locale' && locale === config.defaultLocale

  if (hideDefault) return logical

  if (logical === '/') return `/${locale}`
  return `/${locale}${logical}`
}

const sharedPathPrefixes = ['/api', '/assets', '/_api'] as const

const staticExtensions = new Set([
  'css',
  'gif',
  'html',
  'ico',
  'jpeg',
  'jpg',
  'js',
  'json',
  'map',
  'md',
  'png',
  'svg',
  'ttf',
  'txt',
  'wasm',
  'webp',
  'woff',
  'woff2',
  'xml',
])

export function isSharedPath(pathname: string): boolean {
  const normalized = normalizePath(pathname)
  if (normalized === '/llms.txt' || normalized === '/sitemap.xml' || normalized === '/robots.txt') {
    return true
  }
  return sharedPathPrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}

export function hasStaticExtension(pathname: string): boolean {
  const segment = pathname.split('/').pop() ?? ''
  if (!segment.includes('.')) return false
  const ext = segment.split('.').pop()?.toLowerCase()
  return ext ? staticExtensions.has(ext) : false
}

export function isWithinBasePath(pathname: string, basePath: string): boolean {
  if (basePath === '/') return true
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** Canonical URL path for SEO (respects `hideLocale`). */
export function getPublicPath(path: string, config: I18nConfig | undefined): string {
  if (!config) return normalizePath(path)

  const normalized = normalizePath(path)
  const locale = parseLocale(normalized, config)
  if (config.hideLocale === 'default-locale' && locale === config.defaultLocale) {
    return stripLocale(normalized, config)
  }
  return normalized
}

export function getAlternates(
  path: string,
  config: I18nConfig | undefined,
  options?: getAlternates.Options,
): Record<string, string> | undefined {
  if (!config) return undefined

  const logical = stripLocale(path, config)
  const alternates: Record<string, string> = {}

  for (const locale of config.locales) {
    if (options?.existingLocales && !options.existingLocales.has(locale.code)) continue
    alternates[locale.lang ?? locale.code] = localizePath(logical, locale.code, config)
  }

  return alternates
}

export declare namespace getAlternates {
  type Options = {
    /** When set, only locales with an existing translation are included. */
    existingLocales?: ReadonlySet<string> | undefined
  }
}

export function swapLocale(
  path: string,
  targetLocale: string,
  config: I18nConfig | undefined,
): string {
  if (!config) return path

  const hashIndex = path.indexOf('#')
  const queryIndex = path.indexOf('?')
  const splitIndex =
    hashIndex >= 0 && queryIndex >= 0
      ? Math.min(hashIndex, queryIndex)
      : hashIndex >= 0
        ? hashIndex
        : queryIndex >= 0
          ? queryIndex
          : -1
  const pathname = splitIndex >= 0 ? path.slice(0, splitIndex) : path
  const suffix = splitIndex >= 0 ? path.slice(splitIndex) : ''
  const logical = stripLocale(pathname, config)

  return `${localizePath(logical, targetLocale, config)}${suffix}`
}

export function isLocaleHome(path: string, config: I18nConfig | undefined): boolean {
  if (!config) return normalizePath(path) === '/'

  const normalized = normalizePath(path)
  const locale = parseLocale(normalized, config)

  if (config.hideLocale === 'default-locale') {
    if (normalized === '/') return true
    if (locale && normalized === `/${locale}`) return true
    return false
  }

  if (!locale) return false
  return normalized === `/${locale}`
}

export function getLocale(path: string, config: I18nConfig | undefined): Locale | undefined {
  if (!config) return undefined

  const normalized = normalizePath(path)
  const localeCode =
    parseLocale(normalized, config) ??
    (config.hideLocale === 'default-locale' ? config.defaultLocale : undefined)

  if (!localeCode) return undefined
  return config.locales.find((locale) => locale.code === localeCode)
}

export function shouldSkipI18n(pathname: string): boolean {
  if (pathname.startsWith('/_api/') || pathname === '/api' || pathname.startsWith('/api/')) {
    return true
  }
  if (isSharedPath(pathname)) return true
  if (hasStaticExtension(pathname)) return true
  return false
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  const withoutTrailing = path.endsWith('/') ? path.slice(0, -1) : path
  return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`
}
