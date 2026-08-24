'use client'

import { Menu } from '@base-ui/react/menu'
import { cx } from 'cva'
import { useRouter } from 'waku'
import LucideCheck from '~icons/lucide/check'
import LucideLanguages from '~icons/lucide/languages'
import { useLocale } from '../useLocale.js'

export function LocaleSwitcher(props: LocaleSwitcher.Props) {
  const { className } = props
  const { path } = useRouter()
  const { alternates, locale, locales } = useLocale()

  if (!locales || locales.length < 2 || !alternates) return null

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Change language"
        className={cx(
          'vocs:flex vocs:items-center vocs:justify-center vocs:gap-1.5 vocs:h-8 vocs:px-2 vocs:rounded-md vocs:text-primary/80 vocs:hover:text-heading vocs:hover:bg-surfaceMuted vocs:cursor-pointer',
          className,
        )}
      >
        <LucideLanguages className="vocs:size-4" />
        <span className="vocs:text-[14px] vocs:font-[450]">{locale?.label ?? 'Language'}</span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" sideOffset={8} className="vocs:z-50">
          <Menu.Popup className="vocs:bg-surface vocs:min-w-[160px] vocs:border vocs:border-primary vocs:p-1 vocs:rounded-lg vocs:shadow-lg/5">
            {locales.map((entry) => {
              const href = alternates[entry.lang ?? entry.code]
              if (!href) return null
              const active = entry.code === locale?.code
              const searchIndex = path.indexOf('?')
              const hashIndex = path.indexOf('#')
              const suffixStart =
                searchIndex >= 0 && hashIndex >= 0
                  ? Math.min(searchIndex, hashIndex)
                  : searchIndex >= 0
                    ? searchIndex
                    : hashIndex >= 0
                      ? hashIndex
                      : -1
              const suffix = suffixStart >= 0 ? path.slice(suffixStart) : ''
              return (
                <Menu.Item
                  className="vocs:flex vocs:items-center vocs:justify-between vocs:gap-2 vocs:px-2 vocs:py-1.5 vocs:rounded-md vocs:text-[14px] vocs:text-primary/80 vocs:hover:text-heading vocs:hover:bg-surfaceMuted vocs:data-highlighted:bg-surfaceMuted vocs:cursor-pointer"
                  key={entry.code}
                  render={(props) => (
                    <a
                      {...props}
                      aria-current={active ? 'true' : undefined}
                      href={`${href}${suffix}`}
                    >
                      <span>{entry.label}</span>
                      {active && <LucideCheck className="vocs:size-4 vocs:text-accent7" />}
                    </a>
                  )}
                />
              )
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export declare namespace LocaleSwitcher {
  export type Props = {
    className?: string | undefined
  }
}
