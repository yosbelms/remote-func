import { createService, createApi } from '../server/api'
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

export default createApi({
  query: createService(() => ({
    async bookById(id: number) {
      return data.books.find((b: any) => b.id = id)
    },
    async authorByBook(book: Book) {
      if (book && book.authorId !== void 0) {
        return data.authors.find((a: Author) => a.id = book.authorId)
      }
    },
  }))
})