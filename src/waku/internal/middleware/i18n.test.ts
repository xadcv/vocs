import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import * as I18n from '../../../internal/i18n.js'
import { i18n } from './i18n.js'

const neverConfig = I18n.from({
  defaultLocale: 'en',
  locales: [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
  ],
})

if (!neverConfig) throw new Error('expected i18n config')

const hiddenConfig = I18n.from({
  defaultLocale: 'en',
  hideLocale: 'default-locale',
  locales: [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
  ],
})

if (!hiddenConfig) throw new Error('expected i18n config')

function request(path: string, options?: { basePath?: string; i18n?: I18n.I18nConfig }) {
  const app = new Hono()
  app.use('*', i18n(options))
  app.get('*', (c) => {
    const url = new URL(c.req.url)
    return c.text(url.pathname + url.search)
  })
  return app.request(path)
}

describe('i18n middleware', () => {
  describe('hideLocale: never', () => {
    it('redirects root to default locale', async () => {
      const res = await request('http://localhost/', { i18n: neverConfig })
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/en')
    })

    it('passes through locale-prefixed paths', async () => {
      const res = await request('http://localhost/en/guide', { i18n: neverConfig })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/en/guide')
    })

    it('does not rewrite unprefixed paths', async () => {
      const res = await request('http://localhost/guide', { i18n: neverConfig })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/guide')
    })
  })

  describe('hideLocale: default-locale', () => {
    it('rewrites root to default locale internally', async () => {
      const res = await request('http://localhost/', { i18n: hiddenConfig })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/en')
    })

    it('rewrites unprefixed paths to default locale internally', async () => {
      const res = await request('http://localhost/guide', { i18n: hiddenConfig })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/en/guide')
    })

    it('redirects default locale prefix to canonical path', async () => {
      const res = await request('http://localhost/en/guide', { i18n: hiddenConfig })
      expect(res.status).toBe(308)
      expect(res.headers.get('location')).toBe('/guide')
    })

    it('passes through non-default locale paths', async () => {
      const res = await request('http://localhost/fr/guide', { i18n: hiddenConfig })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('/fr/guide')
    })
  })

  it('skips api routes', async () => {
    const res = await request('http://localhost/api/search', { i18n: neverConfig })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/api/search')
  })

  it('respects redirectRoot: false with hidden default locale', async () => {
    const noRedirect = I18n.from({
      defaultLocale: 'en',
      hideLocale: 'default-locale',
      redirectRoot: false,
      locales: [
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' },
      ],
    })
    if (!noRedirect) throw new Error('expected i18n config')

    const res = await request('http://localhost/', { i18n: noRedirect })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('/')
  })

  it('respects basePath when redirecting root', async () => {
    const res = await request('http://localhost/docs/', {
      basePath: '/docs/',
      i18n: neverConfig,
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/docs/en')
  })
})
