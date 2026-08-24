'use client'

import { useContext, useEffect, useState } from 'react'
import { Link as WakuLink } from 'waku'
import { unstable_RouterContext as WakuRouterContext } from 'waku/router/client'
import * as I18n from '../internal/i18n.js'
import * as Path from '../internal/path.js'
import { useConfig } from './useConfig.js'

const viewportPrefetchDelayMs = 2_000

let viewportPrefetchReady = false
let viewportPrefetchScheduled = false
const viewportPrefetchListeners = new Set<() => void>()

function markViewportPrefetchReady() {
  viewportPrefetchReady = true
  for (const listener of viewportPrefetchListeners) listener()
  viewportPrefetchListeners.clear()
}

function scheduleViewportPrefetch() {
  if (viewportPrefetchReady || viewportPrefetchScheduled || typeof window === 'undefined') return
  viewportPrefetchScheduled = true

  const scheduleAfterLoad = () => {
    window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(markViewportPrefetchReady, { timeout: 2_000 })
        return
      }
      markViewportPrefetchReady()
    }, viewportPrefetchDelayMs)
  }

  if (document.readyState === 'complete') scheduleAfterLoad()
  else window.addEventListener('load', scheduleAfterLoad, { once: true })
}

function useViewportPrefetchReady(enabled: boolean) {
  const [ready, setReady] = useState(viewportPrefetchReady)

  useEffect(() => {
    if (!enabled) return
    if (viewportPrefetchReady) {
      setReady(true)
      return
    }

    const listener = () => setReady(true)
    viewportPrefetchListeners.add(listener)
    scheduleViewportPrefetch()
    return () => {
      viewportPrefetchListeners.delete(listener)
    }
  }, [enabled])

  return enabled && ready
}

export function Link(props: Link.Props) {
  const { to, unstable_prefetchOnEnter = true, unstable_prefetchOnView = true, ...rest } = props
  const router = useContext(WakuRouterContext)
  const routerPath = router?.route.path
  const config = useConfig()
  const isExternal = Path.isExternal(props.to)
  const prefetchOnView = useViewportPrefetchReady(
    Boolean(unstable_prefetchOnView) && !isExternal && routerPath !== undefined,
  )

  if (isExternal) return <a {...rest} href={props.to} rel="noopener noreferrer" target="_blank" />

  const [before, after] = (props.to || '').split('#')
  const resolvedBase = before ? before : (routerPath ?? '')
  const resolvedTo = localizeInternalLink(resolvedBase, routerPath, config.i18n)
  const href = `${resolvedTo}${after ? `#${after}` : ''}`
  if (routerPath === undefined) return <a {...rest} href={href || props.to} />
  return (
    <WakuLink
      {...rest}
      to={href}
      unstable_prefetchOnEnter={unstable_prefetchOnEnter}
      unstable_prefetchOnView={prefetchOnView}
    />
  )
}

export declare namespace Link {
  export type Props = Omit<React.ComponentProps<typeof WakuLink>, 'to'> & {
    to: string
  }
}

function localizeInternalLink(
  target: string,
  routerPath: string | undefined,
  i18n: I18n.I18nConfig | undefined,
) {
  if (!i18n || !target.startsWith('/') || Path.isExternal(target)) return target
  if (I18n.isSharedPath(target.split(/[?#]/)[0] ?? target)) return target

  const hashIndex = target.indexOf('#')
  const queryIndex = target.indexOf('?')
  const splitIndex =
    hashIndex >= 0 && queryIndex >= 0
      ? Math.min(hashIndex, queryIndex)
      : hashIndex >= 0
        ? hashIndex
        : queryIndex >= 0
          ? queryIndex
          : -1
  const base = splitIndex >= 0 ? target.slice(0, splitIndex) : target
  const suffix = splitIndex >= 0 ? target.slice(splitIndex) : ''

  if (I18n.parseLocale(base, i18n)) return target

  if (base === '/' && i18n.redirectRoot === false) return target

  const currentLocale = routerPath ? I18n.getLocale(routerPath, i18n)?.code : i18n.defaultLocale
  if (!currentLocale) return target

  return `${I18n.localizePath(base, currentLocale, i18n)}${suffix}`
}
