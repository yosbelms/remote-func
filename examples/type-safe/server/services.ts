import { createService, Result } from 'remote-func/server'
const store = require('../../store.json')

interface Book {
  isbn: string
  title: string
  subtitle: string
  author: string
  published: string
  publisher: string
  pages: string
  description: string
  website: string
}

export const books = createService(() => ({
  async getAll(): Promise<Result<Book[]>> {
    return store.books
  }
}))
