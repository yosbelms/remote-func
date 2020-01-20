export enum ErrorType {
  EVAL = 0,
  RUNTIME = 1,
  TIMEOUT = 2,
}

export interface BaseError extends Error {
  errorType: ErrorType
}

export class EvalError extends Error {
  errorType: ErrorType = ErrorType.EVAL
}

export class TimeoutError extends Error {
  errorType: ErrorType = ErrorType.TIMEOUT
}
