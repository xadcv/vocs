import { config } from 'virtual:vocs/config'
import groupIconsStylesUrl from 'virtual:vocs/group-icons.css?url'
import userStylesUrl from 'virtual:vocs/user-styles'
import { unstable_getRscPath as getRscPath } from 'waku/router/server'
import * as I18n from '../internal/i18n.js'
import stylesUrl from '../styles/index.css?url'
import { Head } from './Head.js'
import { Root_client } from './Root.client.js'
import { ScrollRestoration } from './ScrollRestoration.js'

export async function Root({ children }: { children: React.ReactNode }) {
  const { colorScheme, accentColor, i18n } = config
  const routePath = getRscPath()
  const locale =
    i18n && routePath
      ? I18n.getLocale(routePath, i18n)
      : i18n
        ? I18n.getLocale(`/${i18n.defaultLocale}`, i18n)
        : undefined
  return (
    <html
      data-vocs
      {...(colorScheme === 'light' || colorScheme === 'dark'
        ? { 'data-vocs-theme': colorScheme }
        : {})}
      dir={locale?.dir ?? 'ltr'}
      lang={locale?.lang ?? locale?.code ?? 'en'}
      style={{ colorScheme, '--vocs-color-accent': accentColor } as never}
      suppressHydrationWarning
    >
      <head>
        <link rel="stylesheet" href={stylesUrl} />
        {userStylesUrl && <link rel="stylesheet" href={userStylesUrl} />}
        {groupIconsStylesUrl && <link rel="stylesheet" href={groupIconsStylesUrl} />}
        <Head includeJsonLd={false} />
      </head>
      <body data-version="1.0">
        <Root_client>{children}</Root_client>
        <ScrollRestoration />
      </body>
    </html>
  )
}
