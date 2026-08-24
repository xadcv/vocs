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
    return {
      code: locale.code,
      label: locale.label,
      lang: locale.lang ?? locale.code,
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

export function getAlternates(
  path: string,
  config: I18nConfig | undefined,
): Record<string, string> | undefined {
  if (!config) return undefined

  const logical = stripLocale(path, config)
  const alternates: Record<string, string> = {}

  for (const locale of config.locales) {
    alternates[locale.lang ?? locale.code] = localizePath(logical, locale.code, config)
  }

  return alternates
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
  if (pathname.startsWith('/_api/')) return true
  if (/\.\w+$/.test(pathname)) return true
  return false
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  const withoutTrailing = path.endsWith('/') ? path.slice(0, -1) : path
  return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`
}
