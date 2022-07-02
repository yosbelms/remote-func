import { SourceLocation } from './func'

/* RemoteFunc message protocol interface */
export interface RequestMessage {
  index: number
  source: string
  args: any[]
  sourceLoc?: SourceLocation
}

export interface ResponseMessage {
  index: number
  result?: any
  error?: {
    name: string
    message: string
  },
  sourceLoc?: SourceLocation
}
