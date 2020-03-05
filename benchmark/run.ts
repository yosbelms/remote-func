import './graphql-server'
import './remote-func-server'

const autocannon = require('autocannon')
const Table = require('cli-table')

const benchmarkDuration = 20

const remoteFuncLoad = () => {
  const source = `async (id) => {
    const book = await query.bookById(id)
    const author = await query.authorByBook(book)

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
  console.log(url)
  return autocannon({ url, duration: benchmarkDuration })
}

const gqlLoad = () => {
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
  console.log(url)
  return autocannon({ url, duration: benchmarkDuration })
}

const run = () => setTimeout(async () => {
  console.log('== Running GraphQL load')
  const gqlResult = await gqlLoad()

  console.log('== Running Remote-func load')
  const remoteFuncResult = await remoteFuncLoad()

  const fmtK = (v: any) => Math.round(v / 1000) + 'K'
  const fmtM = (v: any) => Math.round(v / 1000000) + 'M'
  const percentChange = (a: number, b: number) => Math.round(100 * ((b - a) / a)) + '%'

  const table = new Table({ head: ['', 'GraphQL', 'Remote-func', 'Difference'] })
  table.push(
    {
      'Requests': [
        fmtK(gqlResult.requests.total),
        fmtK(remoteFuncResult.requests.total),
        percentChange(gqlResult.requests.total, remoteFuncResult.requests.total),
      ]
    },
    {
      'Throughput (rps)': [
        fmtM(gqlResult.throughput.total),
        fmtM(remoteFuncResult.throughput.total),
        percentChange(gqlResult.throughput.total, remoteFuncResult.throughput.total),
      ]
    },
    {
      'Latency (ms)': [
        gqlResult.latency.average,
        remoteFuncResult.latency.average,
        percentChange(gqlResult.latency.average, remoteFuncResult.latency.average) || 0,
      ]
    },
  )

  console.log(table.toString())

  process.exit(0)
}, 10000)

run()
