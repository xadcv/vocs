import { describe, expect, test } from 'vitest'
import * as I18n from './i18n.js'

const config = I18n.from({
  defaultLocale: 'en',
  locales: [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français', lang: 'fr-FR' },
  ],
})

describe('from', () => {
  test('returns undefined when options are omitted', () => {
    expect(I18n.from(undefined)).toBeUndefined()
  })

  test('normalizes locales and defaults', () => {
    expect(config).toMatchInlineSnapshot(`
      {
        "defaultLocale": "en",
        "hideLocale": "never",
        "locales": [
          {
            "code": "en",
            "label": "English",
            "lang": "en",
          },
          {
            "code": "fr",
            "label": "Français",
            "lang": "fr-FR",
          },
        ],
        "redirectRoot": true,
      }
    `)
  })

  test('throws when defaultLocale is missing from locales', () => {
    expect(() =>
      I18n.from({
        defaultLocale: 'de',
        locales: [{ code: 'en', label: 'English' }],
      }),
    ).toThrow('i18n.defaultLocale "de" must be one of: en')
  })

  test('throws on duplicate locale codes', () => {
    expect(() =>
      I18n.from({
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English' },
          { code: 'en', label: 'English again' },
        ],
      }),
    ).toThrow('duplicate code')
  })
})

describe('parseLocale', () => {
  test('extracts locale from prefixed path', () => {
    expect(I18n.parseLocale('/en/guide', config)).toBe('en')
    expect(I18n.parseLocale('/fr/guide', config)).toBe('fr')
  })

  test('returns undefined for non-locale paths', () => {
    expect(I18n.parseLocale('/guide', config)).toBeUndefined()
    expect(I18n.parseLocale('/', config)).toBeUndefined()
  })
})

describe('stripLocale', () => {
  test('removes locale prefix', () => {
    expect(I18n.stripLocale('/en/guide/intro', config)).toBe('/guide/intro')
    expect(I18n.stripLocale('/fr', config)).toBe('/')
  })

  test('returns path unchanged when no locale prefix', () => {
    expect(I18n.stripLocale('/guide', config)).toBe('/guide')
  })
})

describe('localizePath', () => {
  test('adds locale prefix when hideLocale is never', () => {
    expect(I18n.localizePath('/guide', 'en', config)).toBe('/en/guide')
    expect(I18n.localizePath('/guide', 'fr', config)).toBe('/fr/guide')
    expect(I18n.localizePath('/', 'en', config)).toBe('/en')
  })

  test('hides default locale prefix when configured', () => {
    const hidden = I18n.from({
      defaultLocale: 'en',
      hideLocale: 'default-locale',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
      ],
    })

    expect(I18n.localizePath('/guide', 'en', hidden)).toBe('/guide')
    expect(I18n.localizePath('/guide', 'fr', hidden)).toBe('/fr/guide')
    expect(I18n.localizePath('/', 'en', hidden)).toBe('/')
    expect(I18n.localizePath('/', 'fr', hidden)).toBe('/fr')
  })
})

describe('getAlternates', () => {
  test('returns localized paths for each locale', () => {
    expect(I18n.getAlternates('/en/guide', config)).toEqual({
      en: '/en/guide',
      'fr-FR': '/fr/guide',
    })
  })
})

describe('isLocaleHome', () => {
  test('detects locale home routes', () => {
    expect(I18n.isLocaleHome('/en', config)).toBe(true)
    expect(I18n.isLocaleHome('/en/guide', config)).toBe(false)
  })

  test('treats root as home when default locale is hidden', () => {
    const hidden = I18n.from({
      defaultLocale: 'en',
      hideLocale: 'default-locale',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
      ],
    })

    expect(I18n.isLocaleHome('/', hidden)).toBe(true)
    expect(I18n.isLocaleHome('/en', hidden)).toBe(true)
    expect(I18n.isLocaleHome('/fr', hidden)).toBe(true)
  })
})

describe('getLocale', () => {
  test('returns locale metadata for prefixed paths', () => {
    expect(I18n.getLocale('/fr/guide', config)?.label).toBe('Français')
  })

  test('falls back to default locale when prefix is hidden', () => {
    const hidden = I18n.from({
      defaultLocale: 'en',
      hideLocale: 'default-locale',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
      ],
    })

    expect(I18n.getLocale('/guide', hidden)?.code).toBe('en')
    expect(I18n.getLocale('/fr/guide', hidden)?.code).toBe('fr')
  })
})

describe('shouldSkipI18n', () => {
  test('skips api routes and static assets', () => {
    expect(I18n.shouldSkipI18n('/_api/api/search')).toBe(true)
    expect(I18n.shouldSkipI18n('/api/search')).toBe(true)
    expect(I18n.shouldSkipI18n('/styles.css')).toBe(true)
    expect(I18n.shouldSkipI18n('/en/guide')).toBe(false)
    expect(I18n.shouldSkipI18n('/v1.0')).toBe(false)
  })
})

describe('getPublicPath', () => {
  test('returns unprefixed path for hidden default locale', () => {
    const hidden = I18n.from({
      defaultLocale: 'en',
      hideLocale: 'default-locale',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
      ],
    })

    expect(I18n.getPublicPath('/en/guide', hidden)).toBe('/guide')
    expect(I18n.getPublicPath('/fr/guide', hidden)).toBe('/fr/guide')
  })
})

describe('isSharedPath', () => {
  test('detects shared routes', () => {
    expect(I18n.isSharedPath('/api/search')).toBe(true)
    expect(I18n.isSharedPath('/llms.txt')).toBe(true)
    expect(I18n.isSharedPath('/en/guide')).toBe(false)
  })
})
