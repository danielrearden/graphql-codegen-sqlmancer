import { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers/config'

export interface SqlmancerPluginConfig extends TypeScriptResolversPluginConfig {
  /**
   * @name withResolvers
   * @type boolean
   * @description Enable generating types for your schema's resolve functions.
   * Any other config options will be passed to the `typescript-resolvers` plugin.
   * @default true
   *
   * @example
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - graphql-codegen-sqlmancer
   *  config:
   *    withResolvers: true
   * ```
   */
  withResolvers?: boolean
}
