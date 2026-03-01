/**
 * Jest transformer for Prisma 7 generated TypeScript files.
 *
 * Problema: Prisma 7's `prisma-client` generator emits TypeScript with
 * `import.meta.url`, que é ESM-only. TypeScript com `module: "commonjs"` não
 * converte `import.meta.url`, então o Jest falha ao executar o arquivo.
 *
 * Solução: Substitui `import.meta.url` pelo equivalente CJS no código-fonte
 * ANTES da compilação TypeScript. Usa `ts.transpileModule` para compilar
 * sem depender dos internos do ts-jest.
 */
const ts = require("typescript");

module.exports = {
  process(sourceText, sourcePath) {
    // Polyfill: import.meta.url → equivalente CommonJS
    const patched = sourceText.replace(
      /import\.meta\.url/g,
      "(require('url').pathToFileURL(__filename).toString())"
    );

    const result = ts.transpileModule(patched, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2017,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
      },
    });

    return { code: result.outputText };
  },
};
