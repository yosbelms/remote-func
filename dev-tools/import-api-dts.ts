import fs from 'fs'
import path from 'path'
import globby from 'globby'
import makeDir from 'make-dir'

export const importApiModuleDts = async (apiModulePath: string, destinationDir: string) => {
  const dstDir = await makeDir(path.resolve(destinationDir))

  compile([apiModulePath], {
    declaration: true,
    allowJs: true,
    emitDeclarationOnly: true,
    noEmitOnError: true,
    declarationDir: dstDir,
    esModuleInterop: true,
  })

  const dTsPaths = await globby([path.join(dstDir, '/**/*.d.ts')])
  dTsPaths.forEach(file => {
    const filename = path.join(
      path.dirname(file),
      path.basename(file, '.d.ts')) + '.js'

    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, '')
    }
  })
}

const compile = (fileNames: string[], options: any): void => {
  let ts: any
  try {
    ts = require('typescript')
  } catch (_) {
    throw new Error('Please add TypeScript as dependency')
  }
  let program = ts.createProgram(fileNames, options)
  let emitResult = program.emit()

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  allDiagnostics.forEach((diagnostic: any) => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
    }
  })
}
