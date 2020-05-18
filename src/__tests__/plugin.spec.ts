import { validateTs } from '@graphql-codegen/testing'
import { plugin } from '..'
import { schemaWithoutDirectives, schemaWithDirectives } from './__fixtures__'
import { mergeOutputs } from '@graphql-codegen/plugin-helpers'

describe('Sqlmancer Plugin', () => {
  describe('schema without directives', () => {
    it('Should generate SqlmancerClient and resolver types', async () => {
      const result = await plugin(schemaWithoutDirectives, [], {}, { outputFile: '' })
      const merged = mergeOutputs([result])
      validateTs(merged)
      expect(merged).toMatchSnapshot()
    })

    it('Should generate only SqlmancerClient types', async () => {
      const result = await plugin(schemaWithoutDirectives, [], { withResolvers: false }, { outputFile: '' })
      const merged = mergeOutputs([result])
      validateTs(merged)
      expect(merged).toMatchSnapshot()
    })
  })
  describe('schema with directives', () => {
    it('Should generate SqlmancerClient and resolver types', async () => {
      const result = await plugin(schemaWithDirectives, [], {}, { outputFile: '' })
      const merged = mergeOutputs([result])
      validateTs(merged)
      expect(merged).toMatchSnapshot()
    })

    it('Should generate only SqlmancerClient types', async () => {
      const result = await plugin(schemaWithDirectives, [], { withResolvers: false }, { outputFile: '' })
      const merged = mergeOutputs([result])
      validateTs(merged)
      expect(merged).toMatchSnapshot()
    })
  })
})
