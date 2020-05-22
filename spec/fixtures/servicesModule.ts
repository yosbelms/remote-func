import { createService } from '../../server'

export const posts = createService(() => ({
  getPost: () => 'post'
}))

export const comments = createService(() => ({}))
