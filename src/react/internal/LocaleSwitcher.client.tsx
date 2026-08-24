'use client'

import { Menu } from '@base-ui/react/menu'
import { cx } from 'cva'
import LucideCheck from '~icons/lucide/check'
import LucideLanguages from '~icons/lucide/languages'
import { Link } from '../Link.js'
import { useLocale } from '../useLocale.js'

export function LocaleSwitcher(props: LocaleSwitcher.Props) {
  const { className } = props
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
              const active = entry.code === locale?.code
              return (
                <Menu.Item
                  className="vocs:flex vocs:items-center vocs:justify-between vocs:gap-2 vocs:px-2 vocs:py-1.5 vocs:rounded-md vocs:text-[14px] vocs:text-primary/80 vocs:hover:text-heading vocs:hover:bg-surfaceMuted vocs:data-highlighted:bg-surfaceMuted vocs:cursor-pointer"
                  key={entry.code}
                  render={<Link to={href} />}
                >
                  <span>{entry.label}</span>
                  {active && <LucideCheck className="vocs:size-4 vocs:text-accent7" />}
                </Menu.Item>
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
