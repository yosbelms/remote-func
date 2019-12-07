export enum ErrorType {
  EVAL = 0,
  RUNTIME = 1,
  TIMEOUT = 2,
  EXIT = 3,
}

export interface BaseError extends Error {
  errorType: ErrorType
}

export class EvalError extends Error {
  errorType: ErrorType = ErrorType.EVAL
}

export class RuntimeError extends Error {
  errorType: ErrorType = ErrorType.RUNTIME
}

export class TimeoutError extends Error {
  errorType: ErrorType = ErrorType.TIMEOUT
}

export class ExitError extends Error {
  errorType: ErrorType = ErrorType.EXIT
}
