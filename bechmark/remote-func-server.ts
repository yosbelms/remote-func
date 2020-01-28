import { setupExpressServer, createRunner } from '../server'
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

const api = {
  async getBookById(id: number) {
    return data.books.find((b: any) => b.id = id)
  },
  async getBookAuthor(book: Book) {
    if (book && book.authorId !== void 0) {
      return data.authors.find((a: Author) => a.id = book.authorId)
    }
  },
}

setupExpressServer({
  path: '/r-func',
  runner: createRunner({
    api,
  })
}).listen(5000, () => {
  console.log(`🚀 Remote-func server ready`)
})
