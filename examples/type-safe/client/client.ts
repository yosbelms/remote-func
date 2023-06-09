import fetch from 'isomorphic-unfetch'
import { createClient, httpHandler, bind, func } from 'remote-func/client'
import { books } from './services-dts'

// http client setup
const client = createClient({
  handler: httpHandler({
    url: 'http://localhost:5000/services',
    fetch: fetch
  })
})

// query
const findTitlesByPublisher = bind(client, func(async (title: string) => {
  const allBooks = await books.getAll()
  return allBooks
    .filter(book => book.publisher == title)
    .map(book => book.title)
}))

const findOReillyBookTitles = () => findTitlesByPublisher(`O'Reilly Media`)
const findNoStarchPressBookTitles = () => findTitlesByPublisher(`No Starch Press`)

findOReillyBookTitles().then(titles => {
  console.log(`\nO'Reilly Media books\n`)
  titles.map(title => console.log(`* ${title}`))
})

findNoStarchPressBookTitles().then(titles => {
  console.log(`\nNo Starch Press\n`)
  titles.map(title => console.log(`* ${title}`))
})
