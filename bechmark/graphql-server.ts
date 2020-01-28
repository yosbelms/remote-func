import { ApolloServer } from 'apollo-server'
const data = require('./data.json')

const typeDefs = `
  type Author {
    id: ID!
    name: String
  }

  type Book {
    id: ID!
    title: String
    author: Author
  }

  type Query {
    bookById(id: ID!): Book
  }
`

const resolvers = {
  Query: {
    async bookById(_: any, { id }: { id: number }) {
      return data.books.find((b: any) => b.id = id)
    }
  },
  Book: {
    async author(book: any) {
      if (book && book.authorId !== void 0) {
        return data.authors.find((a: any) => a.id = book.authorId)
      }
    }
  }
};

new ApolloServer({
  typeDefs,
  resolvers,
}).listen(4000).then(() => {
  console.log(`🚀 GraphQL server ready`)
})
