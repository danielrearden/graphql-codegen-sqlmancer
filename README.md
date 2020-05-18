# Sqlmancer

### Conjure SQL from your GraphQL queries 🧙🔮✨

This is a [Graphql Code Generator](https://graphql-code-generator.com/) plugin for generating types for [Sqlmancer](https://sqlmancer.netlify.app).

### Installation

```sh
npm install --save-dev @graphql-codegen/cli typescript-sqlmancer
```

### Usage

Add a `codegen.yml` configuration file and point it to your type definitions:

```yml
schema: src/**/*.graphql
generates:
  path/to/file.ts:
    plugins:
      - graphql-codegen-sqlmancer
```

Then run the CLI command:

```
npx graphql-codegen
```

### Configuration

The plugin generates both a `SqlmancerClient` type to be used with Sqlmancer, as well as type definitions to be used in your resolvers. This plugin uses the `@graphql-codegen/typescript` and `@graphql-codegen/typescript-resolvers` under the hood to generate the resolver types. You can skip generating these types by setting `withResolvers` to false.

```yml
schema: src/**/*.graphql
generates:
  path/to/file.ts:
    plugins:
      - graphql-codegen-sqlmancer
    config:
      withResolvers: false
```

> NOTE: The plugin will compile your schema, including all transformations applied by Sqlmancer directives, before passing it to the `typescript` and `typescript-resolvers` plugins. These other plugins should not be used in addition to the Sqlmancer plugin -- doing so may result in the generator output not reflecting the final schema.
