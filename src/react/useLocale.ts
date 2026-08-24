'use client'

import { useRouter } from 'waku'
import * as I18n from '../internal/i18n.js'
import { useConfig } from './useConfig.js'

export function useLocale(): useLocale.ReturnType {
  const config = useConfig()
  const { path } = useRouter()
  const i18n = config.i18n

  const locale = I18n.getLocale(path, i18n)
  const currentCode = locale?.code

  return {
    alternates: I18n.getAlternates(path, i18n),
    locale,
    locales: i18n?.locales,
    localizePath: (targetPath: string, localeCode = currentCode) => {
      if (!i18n || !localeCode) return targetPath
      return I18n.localizePath(targetPath, localeCode, i18n)
    },
  }
}

export declare namespace useLocale {
  export type ReturnType = {
    alternates: Record<string, string> | undefined
    locale: I18n.Locale | undefined
    locales: readonly I18n.Locale[] | undefined
    localizePath: (path: string, localeCode?: string) => string
  }
}
