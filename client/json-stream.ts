
const NL_DELIMITER = '\n'
const noop = () => { }

/** create a JSON stream parser */
export const createParser = <T>(options: Partial<{
  /** Stream chunk delimiter \n by default */
  delimiter: string,
  /** Executed on data chunk is successfully parsed */
  onData: (data: T, src: string) => void,
  /** Executed on data chunk fails on parse */
  onError: (error: Error, buf: string) => void,
  /** Executed when the parser is closed */
  onClose: (buffer: string) => void,
}>) => {
  const {
    delimiter = NL_DELIMITER,
    onData = noop,
    onError = noop,
    onClose = noop,
  } = options

  let remaining = ''
  let closed = false

  const throwIfClosed = () => {
    if (closed) throw new Error('Parser closed')
  }

  const handleChunk = (str: string) => {
    try {
      const data = JSON.parse(str)
      onData(data, str)
    } catch (err) {
      onError(err, str)
    }
  }

  return {
    /** Write JSON chunk to parse */
    write(partial: string) {
      throwIfClosed()
      const chunks = String(partial).split(delimiter)
      const lastChunkIdx = chunks.length - 1
      chunks.forEach((chunk, idx) => {
        remaining = remaining + chunk
        if (idx < lastChunkIdx) {
          handleChunk(remaining)
          remaining = ''
        }
      })
    },

    /** Close parser */
    close() {
      const chunkLen = remaining.trim().length
      if (chunkLen > 0) {
        handleChunk(remaining)
      }
      onClose(remaining)
    }
  }
}

/** create a JSON stream stringifier */
export const createStringifier = <T>(options: Partial<{
  /** Stream chunk delimiter \n by default */
  delimiter: string,
  /** Executed on data is successfully stringified */
  onData: (src: string, data: T) => void,
  /** Executed if fails on stringify */
  onError: (error: Error, data: T) => void,
  /** Executed when the stringifier is closed */
  onClose: () => void,
}>) => {
  const {
    delimiter = NL_DELIMITER,
    onData = noop,
    onError = noop,
    onClose = noop,
  } = options
  let closed = false

  const throwIfClosed = () => {
    if (closed) throw new Error('Stringifier closed')
  }

  return {
    /** Write object to stringify */
    write(data: T) {
      throwIfClosed()
      try {
        let str = JSON.stringify(data) + delimiter
        onData(str, data)
      } catch (err) {
        onError(err, data)
      }
    },

    /** Close stringifier */
    close() {
      onClose()
    }
  }
}
