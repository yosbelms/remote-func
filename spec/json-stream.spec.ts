import 'jasmine'
import { createParser, createStringifier } from '../client/json-stream'

const DELIMITER = '\n'

describe('json-stream', () => {
  it('parser, should consume last fragment on close', async () => {
    const strings: string[] = ['0']
    const data: any[] = []
    const parser = createParser({
      delimiter: DELIMITER,
      onData: (d) => data.push(d),
    })

    strings.forEach((s: string) => parser.write(s))

    expect(data).toEqual([])

    parser.close()

    expect(data).toEqual([0])
  })

  it('parser, should work consume on delimiter', async () => {
    const strings: string[] = [
      '{"a":', '1,"b"', ':2', '}', DELIMITER,
      '[1,', '2]', DELIMITER,
      '3',
    ]

    const data: any[] = []
    const parser = createParser({
      delimiter: DELIMITER,
      onData: (d) => data.push(d),
    })

    strings.forEach((s: string) => parser.write(s))
    parser.close()

    expect(data).toEqual([{ a: 1, b: 2 }, [1, 2], 3])
  })

  it('createStringifier should add delimiter on each write', async () => {
    const strings: string[] = []
    const data = [1, 2, 3]

    const stringifier = createStringifier({
      delimiter: DELIMITER,
      onData: (d) => strings.push(d)
    })

    data.forEach((d: any) => stringifier.write(d))

    expect(strings).toEqual(['1' + DELIMITER, '2' + DELIMITER, '3' + DELIMITER])
  })
})
