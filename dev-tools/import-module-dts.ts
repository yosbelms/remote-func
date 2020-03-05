import fs from 'fs'
import path from 'path'
import globby from 'globby'
import makeDir from 'make-dir'

export const importModuleDts = async (apiModulePath: string, destinationDir: string) => {
  const sourcePath = path.resolve(apiModulePath)
  destinationDir = path.resolve(destinationDir)
  const dtsDir = await makeDir(path.join(destinationDir, '/dts'))

  const fileMapping = compile([sourcePath], {
    target: 'ES2019',
    lib: ['lib.es2019.full.d.ts'],
    strict: false,
    declaration: true,
    allowJs: true,
    emitDeclarationOnly: true,
    noEmitOnError: true,
    declarationDir: dtsDir,
    esModuleInterop: true,
  })

  const mainFileDestination = fileMapping[sourcePath]
  fs.writeFileSync(
    path.join(destinationDir, '/index.d.ts'),
    `export * from './${path.relative(
      destinationDir,
      mainFileDestination.slice(0, mainFileDestination.length - '.d.ts'.length)
    )}';`
  )

  const dtsPaths = await globby([path.join(destinationDir, '/**/*.d.ts')])
  dtsPaths.forEach(file => {
    const filename = path.join(
      path.dirname(file),
      path.basename(file, '.d.ts')) + '.js'

    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, '')
    }
  })
}

const compile = (fileNames: string[], options: any, _log: boolean = true): { [source: string]: string } => {
  let ts: any
  try {
    ts = require('typescript')
  } catch (_) {
    throw new Error('Please add TypeScript as dependency')
  }
  const log = _log ? console.log.bind(console) : (...args: any[]) => { }
  const host = ts.createCompilerHost(options)
  const hostGetSourceFile = host.getSourceFile.bind(host)
  const hostWriteFile = host.writeFile.bind(host)
  const fileMapping: { [source: string]: string } = {}

  const getDisplayPath = (fileName: string) => {
    const currentDirectory = host.getCurrentDirectory() + path.sep
    let displayFileName = fileName
    if (fileName.indexOf(currentDirectory) === 0) {
      displayFileName = fileName.slice(currentDirectory.length)
    }
    return displayFileName
  }

  log(`\nImporting from: ${host.getCurrentDirectory()}\n`)
  log(`Sources:`)
  host.getSourceFile = (fileName: string, ...restArgs: any[]) => {
    log(`${getDisplayPath(fileName)}`)
    return hostGetSourceFile(fileName, ...restArgs)
  }

  host.writeFile = (...args: any[]) => {
    const [fileName, _, __, ___, sourceFiles] = args
    const sourceFile = sourceFiles[0]
    if (sourceFile) {
      fileMapping[sourceFile.fileName] = fileName
      log(`${getDisplayPath(fileName)}`)
    }
    return hostWriteFile(...args)
  }

  const program = ts.createProgram(fileNames, options, host)

  log(`\nCompiled:`)
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

  return fileMapping
}
