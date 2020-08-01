/* RemoteFunc message protocol interface */

export interface RequestMessage {
  index: number
  source: string
  args: any[]
}

export interface ResponseMessage {
  index: number
  result?: any
  error?: string
}
