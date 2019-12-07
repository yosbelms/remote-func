import { ErrorType } from './error';

export enum MessageType {
  REQUEST = 0,
  RESPONSE = 1,
  EXECUTE = 2,
  RETURN = 3,
  ERROR = 4,
  EXIT = 5,
}

export interface RequestMessage {
  type: MessageType.REQUEST
  id: number
  basePath: string[]
  method: string
  args: any[]
}

export interface ResponseMessage {
  type: MessageType.RESPONSE
  id: number
  result: any
}

export interface ExecuteMessage {
  type: MessageType.EXECUTE
  source: string
  args: any[]
}

export interface ReturnMessage {
  type: MessageType.RETURN
  result: any
}

export interface ErrorMessage {
  type: MessageType.ERROR
  errorType: ErrorType
  stack: string
}

export interface ExitMessage {
  type: MessageType.EXIT
  code: number
}
