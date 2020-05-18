import {
  GraphQLSchema,
  print,
  printType,
  GraphQLNamedType,
  Kind,
  ObjectTypeExtensionNode,
  isSpecifiedScalarType,
  isIntrospectionType,
  isScalarType,
  parse,
  TypeDefinitionNode,
  DirectiveNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  InputObjectTypeExtensionNode,
  EnumTypeExtensionNode,
  EnumValueDefinitionNode,
} from 'graphql'

export function printSchemaWithDirectives(schema: GraphQLSchema): string {
  const typesMap = schema.getTypeMap()
  const queryType = schema.getQueryType()
  const mutationType = schema.getMutationType()
  const subscriptionType = schema.getSubscriptionType()

  const result: string[] = [
    `schema {
      ${queryType ? `query: ${queryType.toString()}` : ''}
      ${mutationType ? `mutation: ${mutationType.toString()}` : ''}
      ${subscriptionType ? `subscription: ${subscriptionType.toString()}` : ''}
    }`,
  ]

  for (const typeName in typesMap) {
    const type = typesMap[typeName]
    const isPredefinedScalar = isScalarType(type) && isSpecifiedScalarType(type)
    const isIntrospection = isIntrospectionType(type)

    if (isPredefinedScalar || isIntrospection) {
      continue
    }

    // KAMIL: we might want to turn on descriptions in future
    result.push(print(correctType(typeName, typesMap).astNode!))
  }

  const directives = schema.getDirectives()
  for (const directive of directives) {
    if (directive.astNode) {
      result.push(print(directive.astNode))
    }
  }

  return result.join('\n')
}

function extendDefinition(type: GraphQLNamedType): GraphQLNamedType['astNode'] {
  const astNode = type.astNode!
  switch (astNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return {
        ...astNode,
        fields: astNode.fields!.concat(
          (type.extensionASTNodes as ReadonlyArray<ObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields as any),
            []
          )
        ),
      }
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return {
        ...astNode,
        fields: astNode.fields!.concat(
          (type.extensionASTNodes as ReadonlyArray<InputObjectTypeExtensionNode>).reduce(
            (fields, node) => fields.concat(node.fields as any),
            []
          )
        ),
      }
    case Kind.ENUM_TYPE_DEFINITION:
      return {
        ...astNode,
        values: astNode.values!.concat(
          (type.extensionASTNodes as ReadonlyArray<EnumTypeExtensionNode>).reduce(
            (values, node) => values.concat(node.values as any),
            []
          )
        ),
      }
    default:
      return astNode
  }
}

function correctType<TMap extends { [key: string]: GraphQLNamedType }, TName extends keyof TMap>(
  typeName: TName,
  typesMap: TMap
): TMap[TName] {
  const type = typesMap[typeName]

  type.name = typeName.toString()

  if (type.astNode && type.extensionASTNodes) {
    type.astNode = type.extensionASTNodes ? extendDefinition(type) : type.astNode
  }
  const doc = parse(printType(type))
  const fixedAstNode = doc.definitions[0] as TypeDefinitionNode
  const originalAstNode = type?.astNode
  if (originalAstNode) {
    // eslint-disable-next-line no-extra-semi
    ;(fixedAstNode.directives as DirectiveNode[]) = originalAstNode?.directives as DirectiveNode[]
    if ('fields' in fixedAstNode && 'fields' in originalAstNode) {
      for (const fieldDefinitionNode of fixedAstNode.fields!) {
        const originalFieldDefinitionNode = (originalAstNode.fields as (
          | InputValueDefinitionNode
          | FieldDefinitionNode
        )[]).find((field) => field.name.value === fieldDefinitionNode.name.value)
        ;(fieldDefinitionNode.directives as DirectiveNode[]) = originalFieldDefinitionNode?.directives as DirectiveNode[]
      }
    }
    if ('values' in fixedAstNode && 'values' in originalAstNode) {
      for (const enumValueDefinitionNode of fixedAstNode.values!) {
        const originalEnumValueDefinitionNode = (originalAstNode.values as EnumValueDefinitionNode[]).find(
          (enumValue) => enumValue.name.value === enumValueDefinitionNode.name.value
        )
        ;(enumValueDefinitionNode.directives as DirectiveNode[]) = originalEnumValueDefinitionNode?.directives as DirectiveNode[]
      }
    }
  }
  type.astNode = fixedAstNode

  return type
}
