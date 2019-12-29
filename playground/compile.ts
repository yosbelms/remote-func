import * as ts from 'typescript'

export const compileDtsInMemory = (fileNames: string[], options: ts.CompilerOptions) => {
  // Create a Program with an in-memory emit
  const createdFiles: any = {}
  const host = ts.createCompilerHost(options)
  host.writeFile = (fileName: string, contents: string) => createdFiles[fileName] = contents

  // Prepare and emit the d.ts files
  const program = ts.createProgram(fileNames, options, host)
  program.emit()

  // Loop through all the input files
  // fileNames.forEach(file => {
  //   const dts = file.replace('.js', '.d.ts')
  //   console.log(createdFiles[dts])
  // })

  return createdFiles
}
