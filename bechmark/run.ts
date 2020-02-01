import autocannon from 'autocannon'
import './graphql-server'
import './remote-func-server'

const benchmarkDuration = 20

const runRemoteFuncBench = () => {
  console.log('\n== Remote-func ==\n')
  const source = `async (id) => {
    const book = await getBookById(id)
    const author = await getBookAuthor(book)

    return {
      title: book.title,
      author: {
        name: author.name
      }
    }
  }`;

  const request = {
    source,
    args: [1]
  }
  const url = `http://localhost:5000/r-func?requests=${encodeURIComponent(JSON.stringify(request))}`
  autocannon.track(autocannon({ url, duration: benchmarkDuration }, () => process.exit(0)), { renderProgressBar: true })
}

const runGQLBench = () => {
  console.log('\n== GraphQL ==\n')
  const graphQLquery = `
    query GetBookById($id: ID!) {
      bookById(id: $id) {
        title
        author {
          name
        }
      }
    }
  `;
  const graphQLvariables = `{"id": 1}`;
  const url = `http://localhost:4000/graphql?query=${encodeURIComponent(graphQLquery)}&variables=${encodeURIComponent(graphQLvariables)}&operationName=GetBookById`
  autocannon.track(autocannon({url, duration: benchmarkDuration }, () => runRemoteFuncBench()), { renderProgressBar: true })
}

setTimeout(runGQLBench, 10000)
