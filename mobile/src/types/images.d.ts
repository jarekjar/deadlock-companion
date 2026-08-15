/** Metro bundles image assets as numeric references. */
declare module '*.webp' {
  const source: number
  export default source
}
