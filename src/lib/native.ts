import { Capacitor } from '@capacitor/core'

/**
 * True when running inside the Capacitor Android/iOS shell. The native app
 * ships without Steam sign-in (the cookie session only works on the website),
 * so auth affordances and steam:// links are hidden behind this flag.
 */
export const isNative = Capacitor.isNativePlatform()

/** Pages Functions live on the website; the native shell must call them absolutely. */
export const FUNCTIONS_BASE = isNative ? 'https://thecursedapple.app' : ''
