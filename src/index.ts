import _ from 'lodash'
import {
  getSqlmancerConfig,
  typeDefs as sqlmancerTypeDefs,
  schemaDirectives as sqlmancerSchemaDirectives,
} from 'sqlmancer'
import { isEnumType, GraphQLEnumType, isNonNullType } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { Types, PluginFunction } from '@graphql-codegen/plugin-helpers'
import { plugin as tsPlugin } from '@graphql-codegen/typescript'
import { plugin as resolversPlugin } from '@graphql-codegen/typescript-resolvers'
import { unwrap } from 'sqlmancer/dist/utilities'
import { SqlmancerPluginConfig } from './config'
import { printSchemaWithDirectives } from './utils'

export const plugin: PluginFunction<SqlmancerPluginConfig, Types.ComplexPluginOutput> = async (
  schema,
  documents,
  { withResolvers = true, ...config },
  info
) => {
  const typeDefs = printSchemaWithDirectives(schema)
  const sqlmancerSchema = makeExecutableSchema({
    typeDefs: schema.getDirective('sqlmancer') ? typeDefs : [sqlmancerTypeDefs, typeDefs],
    resolverValidationOptions: { requireResolversForResolveType: false },
    schemaDirectives: sqlmancerSchemaDirectives,
  })
  const { dialect, models } = getSqlmancerConfig(sqlmancerSchema)
  const allEnums: Record<string, GraphQLEnumType> = {}
  const prepend: string[] = []
  const content: string[] = []

  prepend.push(`

import {
  CreateManyBuilder,
  CreateOneBuilder,
  DeleteByIdBuilder,
  DeleteManyBuilder,
  FindByIdBuilder,
  FindManyBuilder,
  FindOneBuilder,
  PaginateBuilder,
  UpdateByIdBuilder,
  UpdateManyBuilder
} from 'sqlmancer';

import Knex from 'knex';
`)

  content.push(`

export type ID = number | string;

export type JSON = boolean | number | string | null | JSONArray | JSONObject;

export interface JSONObject {
  [key: string]: JSON;
}

export type JSONArray = Array<JSON>;`)

  Object.keys(models).forEach((name) => {
    const { primaryKey, fields, associations, readOnly } = models[name]

    content.push(`
export type ${name}Fields = {\n${Object.keys(fields)
      .map((fieldName) => `  ${fieldName}: ${getOutputFieldType(fields[fieldName].mappedType)};`)
      .join('\n')}
}`)

    const idFields = Object.keys(fields).filter((fieldName) => fields[fieldName].mappedType === 'ID')
    content.push(`
export type ${name}Ids = ${idFields.length ? idFields.map((fieldName) => `'${fieldName}'`).join(' | ') : 'unknown'};\n`)

    const enums = Object.keys(fields).reduce((acc, fieldName) => {
      const field = fields[fieldName]
      const unwrappedType = schema.getType(unwrap(field.type).name)
      if (isEnumType(unwrappedType)) {
        acc[unwrappedType.name] = unwrappedType
      }
      return acc
    }, {} as Record<string, GraphQLEnumType>)
    Object.assign(allEnums, enums)

    content.push(
      `export type ${name}Enums = ${Object.keys(enums).length ? Object.keys(enums).join(' | ') : 'unknown'};`
    )

    content.push(`
export type ${name}Associations = {\n${Object.keys(associations)
      .map(
        (name) =>
          `  ${name}: [${associations[name].modelName}Find${associations[name].isMany ? 'Many' : 'One'}Builder, ${
            associations[name].modelName
          }PaginateBuilder];`
      )
      .join('\n')}
}`)

    content.push(`
export type ${name}CreateFields = {\n${Object.keys(fields)
      .map((fieldName) => {
        const field = fields[fieldName]
        const required = isNonNullType(field.type) && !field.hasDefault
        return `  ${fieldName}${required ? '' : '?'}: ${getInputFieldType(field.mappedType)};`
      })
      .join('\n')}
};`)

    content.push(`
export type ${name}UpdateFields = {\n${Object.keys(fields)
      .filter((fieldName) => fields[fieldName].column !== primaryKey)
      .map((fieldName) => `  ${fieldName}?: ${getInputFieldType(fields[fieldName].mappedType)};`)
      .join('\n')}
};`)

    content.push(
      `
export type ${name}FindOneBuilder<TSelected extends Pick<${name}Fields, any> = ${name}Fields> = FindOneBuilder<
  '${dialect}',
  ${name}Fields,
  ${name}Ids,
  ${name}Enums,
  ${name}Associations,
  TSelected
>;

export type ${name}FindManyBuilder<TSelected extends Pick<${name}Fields, any> = ${name}Fields> = FindManyBuilder<
  '${dialect}',
  ${name}Fields,
  ${name}Ids,
  ${name}Enums,
  ${name}Associations,
  TSelected
>;

export type ${name}FindByIdBuilder<TSelected extends Pick<${name}Fields, any> = ${name}Fields> = FindByIdBuilder<
  ${name}Fields,
  ${name}Ids,
  ${name}Enums,
  ${name}Associations,
  TSelected
>;

export type ${name}PaginateBuilder = PaginateBuilder<
  '${dialect}',
  ${name}Fields,
  ${name}Ids,
  ${name}Enums,
  ${name}Associations
>;`
    )

    if (!readOnly) {
      content.push(`
export type ${name}DeleteManyBuilder = DeleteManyBuilder<
  '${dialect}',
  ${name}Fields,
  ${name}Ids,
  ${name}Enums,
  ${name}Associations
>;

export type ${name}DeleteByIdBuilder = DeleteByIdBuilder;

export type ${name}CreateManyBuilder = CreateManyBuilder<${name}CreateFields>;

export type ${name}CreateOneBuilder = CreateOneBuilder<${name}CreateFields>;

export type ${name}UpdateManyBuilder = UpdateManyBuilder<
  '${dialect}',
  ${name}UpdateFields,
  ${name}Fields,
  ${name}Ids,
  ${name}Enums,
  ${name}Associations
>;

export type ${name}UpdateByIdBuilder = UpdateByIdBuilder<${name}UpdateFields>;`)
    }
  })

  content.push(`
export type SqlmancerClient = Knex & {
  models: {${Object.keys(models)
    .map((name) => {
      const { readOnly } = models[name]
      return `
    ${name}: {
      findById: (id: ID) => ${name}FindByIdBuilder;
      findMany: () => ${name}FindManyBuilder;
      findOne: () => ${name}FindOneBuilder;
      paginate: () => ${name}PaginateBuilder;${
        readOnly
          ? ''
          : `
      createMany: (input: ${name}CreateFields[]) => ${name}CreateManyBuilder;
      createOne: (input: ${name}CreateFields) => ${name}CreateOneBuilder;
      deleteById: (id: ID) => ${name}DeleteByIdBuilder;
      deleteMany: () => ${name}DeleteManyBuilder;
      updateById: (id: ID, input: ${name}UpdateFields) => ${name}UpdateByIdBuilder;
      updateMany: (input: ${name}UpdateFields) => ${name}UpdateManyBuilder;`
      }
    };`
    })
    .join('')}
  };
};
`)

  const pluginConfig = _.merge(
    {
      namingConvention: {
        enumValues: 'keep',
      },
      enumValues: Object.keys(allEnums).reduce((acc, enumName) => {
        const enumType = allEnums[enumName]
        acc[enumType.name] = enumType.getValues().reduce((acc, enumValue) => {
          acc[enumValue.name] = enumValue.value
          return acc
        }, {} as Record<string, any>)
        return acc
      }, {} as Record<string, Record<string, string>>),
    } as SqlmancerPluginConfig,
    config
  )
  const ts = await tsPlugin(sqlmancerSchema, documents, pluginConfig, info)
  const resolvers = withResolvers
    ? await resolversPlugin(sqlmancerSchema, documents, pluginConfig, info)
    : { content: '', prepend: [], append: [] }

  return {
    content: ts.content + '\n\n' + resolvers.content + '\n\n' + content.join('\n'),
    prepend: [...(resolvers.prepend || []), ...(ts.prepend || []), ...prepend],
    append: [...(ts.append || []), ...(resolvers.append || [])],
  }
}

function getOutputFieldType(mappedType: string) {
  switch (mappedType) {
    case 'Date':
      return 'string'
    case 'Date[]':
      return 'string[]'
    default:
      return mappedType
  }
}

function getInputFieldType(mappedType: string) {
  switch (mappedType) {
    case 'Date':
      return 'Date | string'
    case 'Date[]':
      return 'Date[] | string[]'
    default:
      return mappedType
  }
}
