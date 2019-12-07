import ts from 'typescript'

export const compile = (fileNames: string[], options: ts.CompilerOptions): void => {
  let program = ts.createProgram(fileNames, options)
  let emitResult = program.emit()

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  allDiagnostics.forEach((diagnostic: ts.Diagnostic) => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
    }
  })
}
