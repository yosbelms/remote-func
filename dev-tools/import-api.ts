import fs from 'fs'
import path from 'path'
import globby from 'globby'
import makeDir from 'make-dir'
import ts from 'typescript'

export const importApiModule = async (apiModulePath: string, destinationDir: string) => {
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

const compile = (fileNames: string[], options: ts.CompilerOptions): void => {
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

