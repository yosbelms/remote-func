
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

  let buffer = ''
  let closed = false
  const delimiterLen = delimiter.length

  const throwIfClosed = () => {
    if (closed) throw new Error('Parser closed')
  }

  return {
    write(partial: string) {
      throwIfClosed()

      let ptr
      let buf = buffer + String(partial)

      while ((ptr = buf.indexOf(delimiter)) >= 0) {
        if (ptr == 0) {
          buf = buf.slice(delimiterLen)
          continue
        }

        try {
          const str = buf.slice(0, ptr)
          const data = JSON.parse(str)
          onData(data, str)
        } catch (err) {
          onError(err, buf)
        }

        buf = buf.slice(ptr + 1)
      }

      buffer = buf
    },

    close() {
      onClose(buffer)
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


