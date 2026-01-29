import fs from 'fs'
import path from 'path'
import globby from 'globby'
import makeDir from 'make-dir'
import rimraf from 'rimraf'

export const extractDts = async (
  apiModulePath: string,
  destinationDir: string,
  tscConfig: { [key: string]: any } = {}
) => {
  const ts = require('typescript')
  const sourcePath = path.resolve(apiModulePath)
  destinationDir = path.resolve(destinationDir)
  const signatureFilePath = path.join(destinationDir, '/.extract-dts')

  if (fs.existsSync(signatureFilePath)) {
    rimraf.sync(destinationDir)
  }

  const dtsDir = await makeDir(path.join(destinationDir, '/dts'))
  fs.writeFileSync(signatureFilePath, '')

  // 1. Load your actual project tsconfig to get module resolution rules
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json")
  const configFile = configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {}

  // 2. Merge your project config with the necessary overrides for DTS extraction
  const parsedConfig = ts.parseJsonConfigFileContent(
    {
      ...configFile,
      compilerOptions: {
        ...configFile.compilerOptions,
        target: 'ES2020',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2020', 'DOM'],
        declaration: true,
        emitDeclarationOnly: true,
        declarationDir: dtsDir,
        skipLibCheck: true, // Fixes the Buffer/Uint8Array error
        noEmitOnError: false,
        allowJs: true,
        ...tscConfig,
      }
    },
    ts.sys,
    process.cwd()
  )

  // 3. Run the compiler with the correctly parsed options
  const fileMapping = compile([sourcePath], parsedConfig.options)

  const mainFileDestination = String(fileMapping[sourcePath])
  if (!mainFileDestination || mainFileDestination === 'undefined') {
    throw new Error(`Failed to generate .d.ts for ${sourcePath}. Check compiler errors above.`)
  }

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
  
  // Create host using the ALREADY PARSED options
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

  host.writeFile = (fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void, sourceFiles?: readonly any[]) => {
    if (sourceFiles && sourceFiles.length > 0) {
      const sourceFile = sourceFiles[0]
      fileMapping[path.resolve(sourceFile.fileName)] = path.resolve(fileName)
      log(`${getDisplayPath(fileName)}`)
    }
    return hostWriteFile(fileName, data, writeByteOrderMark, onError, sourceFiles)
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
