import * as path from 'path';

export interface SymbolDefinition {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type';
  line: number;
  file: string; // relative path
}

export class SymbolIndex {
  private fileSymbols: Map<string, SymbolDefinition[]> = new Map();
  private allSymbolsByName: Map<string, SymbolDefinition[]> = new Map();

  public clear(): void {
    this.fileSymbols.clear();
    this.allSymbolsByName.clear();
  }

  /**
   * Parses and indexes function, class, and type symbols from a file's content
   */
  public indexFile(relPath: string, content: string): SymbolDefinition[] {
    const normPath = relPath.replace(/\\/g, '/');
    const ext = path.extname(normPath).toLowerCase();
    const symbols: SymbolDefinition[] = [];

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      // 1. Python (def foo, class Bar)
      if (ext === '.py' || ext === '.pyw') {
        const pyDefMatch = /^\s*def\s+([a-zA-Z0-9_]+)\s*\(/m.exec(line);
        if (pyDefMatch && !pyDefMatch[1].startsWith('__')) {
          symbols.push({ name: pyDefMatch[1], kind: 'function', line: lineNum, file: normPath });
          continue;
        }
        const pyClassMatch = /^\s*class\s+([a-zA-Z0-9_]+)/m.exec(line);
        if (pyClassMatch) {
          symbols.push({ name: pyClassMatch[1], kind: 'class', line: lineNum, file: normPath });
          continue;
        }
      }

      // 2. TypeScript / JavaScript (function foo, const foo = () =>, class Bar, export const foo)
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
        const jsFuncMatch = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/m.exec(line);
        if (jsFuncMatch) {
          symbols.push({ name: jsFuncMatch[1], kind: 'function', line: lineNum, file: normPath });
          continue;
        }
        const jsArrowMatch = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/m.exec(line);
        if (jsArrowMatch) {
          symbols.push({ name: jsArrowMatch[1], kind: 'function', line: lineNum, file: normPath });
          continue;
        }
        const jsClassMatch = /(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_]+)/m.exec(line);
        if (jsClassMatch) {
          symbols.push({ name: jsClassMatch[1], kind: 'class', line: lineNum, file: normPath });
          continue;
        }
        const jsInterfaceMatch = /(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)/m.exec(line);
        if (jsInterfaceMatch) {
          symbols.push({ name: jsInterfaceMatch[1], kind: 'interface', line: lineNum, file: normPath });
          continue;
        }
      }

      // 3. Go (func Foo(), func (r) Foo(), type Bar struct)
      if (ext === '.go') {
        const goFuncMatch = /^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/m.exec(line);
        if (goFuncMatch) {
          symbols.push({ name: goFuncMatch[1], kind: 'function', line: lineNum, file: normPath });
          continue;
        }
        const goTypeMatch = /^type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface)/m.exec(line);
        if (goTypeMatch) {
          symbols.push({ name: goTypeMatch[1], kind: 'class', line: lineNum, file: normPath });
          continue;
        }
      }

      // 4. Rust (fn foo(), struct Bar, enum Baz)
      if (ext === '.rs') {
        const rustFnMatch = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(/m.exec(line);
        if (rustFnMatch) {
          symbols.push({ name: rustFnMatch[1], kind: 'function', line: lineNum, file: normPath });
          continue;
        }
        const rustStructMatch = /^\s*(?:pub\s+)?(?:struct|enum)\s+([a-zA-Z0-9_]+)/m.exec(line);
        if (rustStructMatch) {
          symbols.push({ name: rustStructMatch[1], kind: 'class', line: lineNum, file: normPath });
          continue;
        }
      }

      // 5. Java / C# (public void foo(), class Bar)
      if (['.java', '.cs', '.kt'].includes(ext)) {
        const jvmClassMatch = /(?:public|protected|private)?\s*(?:static\s+)?class\s+([a-zA-Z0-9_]+)/m.exec(line);
        if (jvmClassMatch) {
          symbols.push({ name: jvmClassMatch[1], kind: 'class', line: lineNum, file: normPath });
          continue;
        }
        const jvmMethodMatch = /(?:public|protected|private)\s+(?:static\s+)?(?:async\s+)?[a-zA-Z0-9_<>[\]]+\s+([a-zA-Z0-9_]+)\s*\(/m.exec(line);
        if (jvmMethodMatch && !['if', 'for', 'while', 'switch'].includes(jvmMethodMatch[1])) {
          symbols.push({ name: jvmMethodMatch[1], kind: 'function', line: lineNum, file: normPath });
          continue;
        }
      }
    }

    this.fileSymbols.set(normPath, symbols);

    for (const sym of symbols) {
      if (!this.allSymbolsByName.has(sym.name)) {
        this.allSymbolsByName.set(sym.name, []);
      }
      this.allSymbolsByName.get(sym.name)!.push(sym);
    }

    return symbols;
  }

  public getSymbolsForFile(relPath: string): SymbolDefinition[] {
    const norm = relPath.replace(/\\/g, '/');
    return this.fileSymbols.get(norm) || [];
  }

  public findCallers(symbolName: string, allFilesContent: Map<string, string>): Array<{ file: string; line: number }> {
    const callers: Array<{ file: string; line: number }> = [];
    const symbolDefs = this.allSymbolsByName.get(symbolName) || [];
    const definingFiles = new Set(symbolDefs.map((s) => s.file));

    // Regex checking if symbolName is referenced as a call or identifier (e.g. `foo(` or `foo.`)
    const callRegex = new RegExp(`\\b${symbolName}\\b`, 'g');

    for (const [file, content] of allFilesContent.entries()) {
      if (definingFiles.has(file)) continue; // skip definition file for external callers

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (callRegex.test(lines[i])) {
          callers.push({ file, line: i + 1 });
          if (callers.length >= 10) break; // cap for performance
        }
      }
    }

    return callers;
  }
}
