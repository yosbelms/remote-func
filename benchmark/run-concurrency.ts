import pSettle from 'p-settle'
import pTimeout from 'p-timeout'
import fetch from 'node-fetch'
import colors from 'colors'
const Table = require('cli-table3')
import { func } from '../client'
import { funcUrl } from '../client/util'
import './remote-func-server'

const fmtNumber = (n: number) => Math.round(Number(n))

const buildGroupStats = (group: Group, duration: number) => {
  let countSum = 0
  let latencySum = 0
  const actions = group.actions

  actions.forEach((action: Action) => {
    action.count = fmtNumber(action.count)
    action.aps = fmtNumber(action.count / duration)
    action.meanLatency = fmtNumber(action.count ? action.sumLatency / action.count : 0)
    countSum = countSum + action.count
    latencySum = latencySum + action.sumLatency
  })

  group.summary = {
    count: fmtNumber(countSum),
    aps: fmtNumber(actions.length ? countSum / duration : 0),
    meanLatency: fmtNumber(actions.length ? latencySum / countSum : 0),
  }
}

const runGroup = async (
  actions: Action[],
  duration: number = 5,
  concurrency: number = 1
) => {
  const durationMs = duration * 1000
  const beginTime = Date.now()
  const elapsed = (beginTime: number) => Date.now() - beginTime

  await Promise.all(actions.map((action: Action, idx: number) => {
    const exec = action.exec
    const client = async () => {
      while (true) {
        const outOfTime = elapsed(beginTime) >= durationMs
        if (outOfTime) break
        try {
          const startTime = Date.now()
          await exec()
          if (!outOfTime) {
            const latency = Date.now() - startTime
            action.count++
            action.minLatency = Math.min(action.minLatency, latency)
            action.maxLatency = Math.max(action.maxLatency, latency)
            action.sumLatency = action.sumLatency + latency
          }
        } catch (e) { }
      }
    }

    return pSettle(Array.from({ length: concurrency }, () => pTimeout(client(), durationMs)))
  }))
}

interface Stat {
  count: number
  aps: number
  minLatency: number
  maxLatency: number
  sumLatency: number
  meanLatency: number
}

interface Action extends Stat {
  desc: string
  exec: Function
}

interface Group {
  desc: string
  actions: Action[]
  summary?: Partial<Stat>
  befores: Function[]
  afters: Function[]
}

const createGroup = (desc: string) => ({
  desc,
  actions: [],
  befores: [],
  afters: [],
})

const createAction = (desc: string, exec: Function = () => { }) => ({
  desc,
  exec,
  count: 0,
  aps: 0,
  maxLatency: -Infinity,
  minLatency: Infinity,
  sumLatency: 0,
  meanLatency: 0,
})

const groups: Group[] = [createGroup('')]
const currentGroup = () => groups[groups.length - 1]

const group = (desc: string, init: Function) => {
  groups.push(createGroup(desc))
  init()
}

const action = (desc: string, exec: Function) => {
  currentGroup().actions.push(createAction(desc, exec))
}

const before = (exec: Function) => {
  currentGroup().befores.push(exec)
}

const after = (exec: Function) => {
  currentGroup().afters.push(exec)
}

const run = async ({
  duration,
  concurrency,
  showResults,
}: {
  duration: number,
  concurrency?: number,
  showResults?: boolean
}) => {
  const table = new Table({ head: [] })

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const { actions, befores, afters } = group
    if (actions.length === 0) continue

    console.log(`=> ${group.desc}`)

    while (befores.length) {
      const before = befores.shift()
      if (before) await before()
    }

    try {
      await runGroup(actions, duration, concurrency)
      buildGroupStats(group, duration)

      table.push([
        colors.magenta(group.desc),
        colors.green('Total'),
        colors.green('APS'),
        colors.green('Latency'),
      ])
      actions.forEach((action: Action) => table.push([
        { content: colors.cyan(action.desc), hAlign: 'left' },
        { content: action.count, hAlign: 'right' },
        { content: action.aps, hAlign: 'right' },
        { content: action.meanLatency, hAlign: 'right' },
      ]))
      const summary = group.summary
      table.push([
        '',
        { content: colors.gray(String(summary?.count)), hAlign: 'right' },
        { content: colors.gray(String(summary?.aps)), hAlign: 'right' },
        { content: colors.gray(String(summary?.meanLatency)), hAlign: 'right' },
      ])
    } catch (e) {
      console.log(e.stack)
    }

    while (afters.length) {
      const after = afters.shift()
      if (after) await after()
    }
  }

  if (showResults) {
    console.log(table.toString())
  }
  process.exit(0)
}

group('Remote Func concurrency', () => {
  const remoteFuncAuthorsAndBooks = funcUrl('http://localhost:5000/r-func', func`async (id) => {
    const book = await query.bookById(id)
    const author = await query.authorByBook(book)
    return {
      title: book.title,
      author: {
        name: author.name
      }
    }
  }`)
  const rf1 = funcUrl('http://localhost:5000/r-func', func`async () => {
    const arr = []
    for (;;) arr.push([])
  }`)
  const rf2 = funcUrl('http://localhost:5000/r-func', func`async () => {
    const arr = []
    for (let i = 0; i < 1000 ;i++) arr.push([])
  }`)
  const rf3 = funcUrl('http://localhost:5000/r-func', func`async () => {
    Array.from({length: 1e99}, () => [])
  }`)
  const rf4 = funcUrl('http://localhost:5000/r-func', func`async () => {
    const arr = new Array()
    for (;;) arr.push(new Date())
  }`)


  action('*ControlQuery', async () => fetch(remoteFuncAuthorsAndBooks(1)))
  action('FastIncreasingHeap', async () => fetch(rf1()))
  action('ForLoop', async () => fetch(rf2()))
  action('LongArray', async () => fetch(rf3()))
  action('FastIncreasingHeap w/ new operator', async () => fetch(rf4()))
})

run({
  duration: 60,
  concurrency: 20,
  showResults: true
})
