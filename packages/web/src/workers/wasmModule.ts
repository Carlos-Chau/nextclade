import { isNumber } from 'lodash'
import serializeJavascript from 'serialize-javascript'

import emscriptenJsRaw from 'wasm/nextclade_wasm'
import wasmPath from 'wasm/nextclade_wasm.wasm'

type MyModule = any

type EmscriptenRuntimeModule = any

export class WasmNativeError extends Error {}

export class WasmNativeErrorUnknown extends Error {}

export async function runWasmModule<T>(module: MyModule, runFunction: (module: MyModule) => T) {
  try {
    return runFunction(module)
  } catch (error: unknown) {
    if (error instanceof Error) {
      const newError = new Error(`When running Webassembly module: ${error.message}`)
      newError.stack = error.stack
      newError.name = error.name
      throw newError
    } else if (isNumber(error)) {
      const message = module.getExceptionMessage(error)
      throw new WasmNativeError(message)
    } else {
      const details = serializeJavascript(error, { space: 2 })
      throw new WasmNativeErrorUnknown(
        `When running Webassembly module: Unknown native module error. Details:\n${details}`,
      )
    }
  }
}

export async function loadWasmModule(name: string): Promise<MyModule> {
  return new Promise((resolve) => {
    const js = emscriptenJsRaw as EmscriptenRuntimeModule
    const module = js({
      locateFile: (path: string) => {
        return /* path.includes(name) && */ path.endsWith('.wasm') ? wasmPath : path
      },
      onRuntimeInitialized: () => {
        resolve(module)
      },
    })
  })
}
