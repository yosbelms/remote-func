import { endpoint } from '../server'
const data = require('./data.json')

type Author = {
  id: number
  name: String
}

type Book = {
  id: number
  title: String
  authorId: number
  author: Author
}

export const query = {
  bookById: endpoint(_ => async (id: number) => {
    return data.books.find((b: any) => b.id = id)
  }),
  authorByBook: endpoint(_ => async (book: Book) => {
    if (book && book.authorId !== void 0) {
      return data.authors.find((a: Author) => a.id = book.authorId)
    }
  }),
}

