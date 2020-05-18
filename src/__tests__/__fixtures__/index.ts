import { buildSchema } from 'graphql'
import { makeSqlmancerSchema } from 'sqlmancer'

export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON
  scalar JSONObject

  type Query
    @sqlmancer(
      dialect: POSTGRES
      transformFieldNames: SNAKE_CASE
      customScalars: { JSON: ["JSON", "JSONObject"], Date: ["DateTime"] }
    ) {
    actors: [Actor!]! @many
    actor(id: ID!): Actor
    actorsPaginated: Actor @paginate @many(model: "Actor")
    films: [Film!]! @limit @offset @where @orderBy
    film(id: ID!): Film
    filmsPaginated: Film @paginate @many(model: "Film")
    customers: [Customer!]! @many
    customer(id: ID!): Customer
    addresses: [Address!]! @many
    address(id: ID!): Address
    movies: [Movie!]! @many
    people: [Person!]! @many
  }

  type Mutation {
    createCustomer: Customer @input(action: CREATE)
    createCustomers: [Customer!]! @input(action: CREATE, list: true)
    deleteCustomer(id: ID): Boolean!
    deleteCustomers: Boolean! @where(model: "Customer")
    updateCustomer(id: ID): Customer @input(action: UPDATE)
    updateCustomers: [Customer!]! @where @input(action: UPDATE)
  }

  type Actor @model(table: "actor", pk: "actor_id") {
    id: ID! @col(name: "actor_id") @hasDefault
    firstName: String!
    lastName: String!
    lastUpdate: DateTime! @hasDefault
    films: [Film!]!
      @relate(on: [{ from: "actor_id", to: "actor_id" }, { from: "film_id", to: "film_id" }], through: "film_actor")
      @many
    filmsPaginated: Film
      @relate(
        on: [{ from: "actor_id", to: "actor_id" }, { from: "film_id", to: "film_id" }]
        through: "film_actor"
        pagination: OFFSET
      )
      @paginate
      @many(model: "Film")
  }

  type Film @model(table: "film", pk: "film_id") {
    id: ID! @col(name: "film_id") @hasDefault
    title: String!
    description: String!
    releaseYear: Int!
    length: Int!
    rating: FilmRating!
    rentalRate: Float!
    rentalDuration: Int!
    replacementCost: Float!
    specialFeatures: [String!]!
    extraData: JSON!
    lastUpdate: DateTime! @hasDefault
    actors: [Actor!]!
      @relate(on: [{ from: "film_id", to: "film_id" }, { from: "actor_id", to: "actor_id" }], through: "film_actor")
      @many
    categories: [Category!]!
      @relate(
        on: [{ from: "film_id", to: "film_id" }, { from: "category_id", to: "category_id" }]
        through: "film_category"
      )
      @many
    actorsPaginated: Actor
      @relate(
        on: [{ from: "film_id", to: "film_id" }, { from: "actor_id", to: "actor_id" }]
        through: "film_actor"
        pagination: OFFSET
      )
      @paginate
      @many(model: "Actor")
    language: Language! @relate(on: { from: "language_id", to: "language_id" })
    originalLanguage: Language @relate(on: { from: "original_language_id", to: "language_id" })
    sequel: Film @relate(on: { from: "sequel_id", to: "film_id" })
  }

  type Language @model(table: "language", pk: "language_id") {
    id: ID! @col(name: "language_id") @hasDefault
    name: String!
    lastUpdate: DateTime! @hasDefault
    films: [Film!]! @relate(on: { from: "language_id", to: "language_id" }) @many
    filmsPaginated: Film
      @relate(on: { from: "language_id", to: "language_id" }, pagination: OFFSET)
      @paginate
      @many(model: "Film")
  }

  type Customer @model(table: "customer", pk: "customer_id") {
    id: ID! @col(name: "customer_id") @hasDefault
    firstName: String!
    lastName: String!
    email: String
    lastUpdate: DateTime! @hasDefault
  }

  type CreateCustomerPayload {
    customer: Film
    message: String
  }

  type Category @model(table: "category", pk: "category_id", readOnly: true) {
    id: ID! @col(name: "category_id") @hasDefault
    name: String!
    lastUpdate: DateTime! @hasDefault
    films: [Film!]!
      @relate(
        on: [{ from: "category_id", to: "category_id" }, { from: "film_id", to: "film_id" }]
        through: "film_category"
      )
      @many
  }

  type Address
    @model(
      pk: "id"
      cte: """
      SELECT
        address.address_id AS id,
        address.address AS address_line,
        address.address2 AS address_line_2,
        address.postal_code AS postal_code,
        city.city AS city,
        country.country AS country,
        address.last_update AS last_update
      FROM address
      INNER JOIN city ON address.city_id = city.city_id
      INNER JOIN country ON city.country_id = country.country_id
      """
    ) {
    id: ID!
    addressLine: String!
    addressLine2: String
    postalCode: String
    city: String!
    country: String!
    lastUpdate: DateTime!
  }

  interface Movie @model(table: "film", pk: "film_id", include: ["length"]) {
    id: ID!
    title: String!
    description: String!
    releaseYear: Int!
    length: Int!
    rating: FilmRating!
    rentalRate: Float!
    rentalDuration: Int!
    replacementCost: Float!
    extraData: JSON!
    lastUpdate: DateTime!
  }

  type ShortMovie implements Movie {
    id: ID! @col(name: "film_id") @hasDefault
    title: String!
    description: String!
    releaseYear: Int!
    length: Int!
    rating: FilmRating!
    rentalRate: Float!
    rentalDuration: Int!
    replacementCost: Float!
    extraData: JSON!
    lastUpdate: DateTime! @hasDefault
  }

  type LongMovie implements Movie {
    id: ID! @col(name: "film_id") @hasDefault
    title: String!
    description: String!
    releaseYear: Int!
    length: Int!
    rating: FilmRating!
    rentalRate: Float!
    rentalDuration: Int!
    replacementCost: Float!
    extraData: JSON!
    lastUpdate: DateTime! @hasDefault
  }

  union Person
    @model(
      pk: "customer_id"
      cte: """
      SELECT
      'customer_' || customer_id as customer_id,
        first_name,
        last_name,
        email,
        last_update,
        'Customer' as __typename
      FROM customer
      UNION
      SELECT
        'actor' || actor_id as customer_id,
        first_name,
        last_name,
        NULL as email,
        last_update,
        'Actor' as __typename
      FROM actor
      """
      include: ["__typename"]
    ) =
      Actor
    | Customer

  enum FilmRating {
    G
    PG
    PG13 @value(is: "PG-13")
    R
    NC17 @value(is: "NC-17")
  }
`
export const schemaWithoutDirectives = buildSchema(typeDefs, { assumeValid: true })

export const schemaWithDirectives = makeSqlmancerSchema({
  typeDefs,
  resolverValidationOptions: { requireResolversForResolveType: false },
})
