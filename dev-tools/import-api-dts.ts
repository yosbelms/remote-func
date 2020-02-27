import fs from 'fs'
import path from 'path'
import globby from 'globby'
import makeDir from 'make-dir'

export const importApiModuleDts = async (apiModulePath: string, destinationDir: string) => {
  const dstDir = await makeDir(path.resolve(destinationDir))

  compile([apiModulePath], {
    target: 'ES2019',
    lib: ['lib.es2019.full.d.ts'],
    strict: false,
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

const compile = (fileNames: string[], options: any, _log: boolean = true): void => {
  let ts: any
  try {
    ts = require('typescript')
  } catch (_) {
    throw new Error('Please add TypeScript as dependency')
  }
  const log = _log ? console.log.bind(console) : (...args: any[]) => {}
  const host = ts.createCompilerHost(options)
  const hostGetSourceFile = host.getSourceFile.bind(host)
  log(`\nImporting from: ${host.getCurrentDirectory()}\n`)
  log(`Sources:`)
  host.getSourceFile = (fileName: string, ...restArgs: any[]) => {
    const currentDirectory = host.getCurrentDirectory() + path.sep
    let displayFileName = fileName
    if (fileName.indexOf(currentDirectory) === 0) {
      displayFileName = fileName.slice(currentDirectory.length)
    }
    log(`${displayFileName}`)
    return hostGetSourceFile(fileName, ...restArgs)
  }
  const program = ts.createProgram(fileNames, options, host)
  const emitResult = program.emit()

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  allDiagnostics.forEach((diagnostic: any) => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
    }
  })
}
