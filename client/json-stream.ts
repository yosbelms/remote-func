
const NL_DELIMITER = '\n'
const noop = () => { }

export const createParser = <T>(options: Partial<{
  delimiter: string,
  onData: (data: T, src: string) => void,
  onError: (error: Error, buf: string) => void,
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

    close() {
      const chunkLen = remaining.trim().length
      if (chunkLen > 0) {
        handleChunk(remaining)
      }
      onClose(remaining)
    }
  }
}

export const createStringifier = <T>(options: Partial<{
  delimiter: string,
  onData: (src: string, data: T) => void,
  onError: (error: Error, data: T) => void,
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
    write(data: T) {
      throwIfClosed()
      try {
        let str = JSON.stringify(data) + delimiter
        onData(str, data)
      } catch (err) {
        onError(err, data)
      }
    },

    close() {
      onClose()
    }
  }
}


