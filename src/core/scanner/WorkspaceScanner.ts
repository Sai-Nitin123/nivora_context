import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectMeta {
  name: string;
  architecture: string;
  frameworks: string[];
  dependencies: string[];
  packageManager: string;
}

export interface WorkspaceScanResult {
  files: string[];
  meta: ProjectMeta;
  dependencyMap: Map<string, string[]>;
  dependentsMap: Map<string, string[]>;
  testFilesMap: Map<string, string[]>;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'vendor',
  '.gemini',
  '.nivora',
  '.idea',
  '.vscode',
]);

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java']);

export class WorkspaceScanner {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  public async scan(maxFiles = 3000): Promise<WorkspaceScanResult> {
    const files: string[] = [];
    await this.walkDir(this.workspaceRoot, files, maxFiles);

    const meta = await this.detectProjectMeta();
    const dependencyMap = new Map<string, string[]>();
    const dependentsMap = new Map<string, string[]>();
    const testFilesMap = new Map<string, string[]>();

    // Process code files for imports & dependencies
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!CODE_EXTENSIONS.has(ext)) continue;

      const normalized = path.relative(this.workspaceRoot, file).replace(/\\/g, '/');
      const importedPaths = await this.extractImports(file);
      const resolvedImports: string[] = [];

      for (const imp of importedPaths) {
        if (imp.startsWith('.')) {
          // Resolve relative file
          const dir = path.dirname(file);
          const resolved = this.resolveRelativeImport(dir, imp, files);
          if (resolved) {
            const normResolved = path.relative(this.workspaceRoot, resolved).replace(/\\/g, '/');
            resolvedImports.push(normResolved);

            // Add reverse mapping (dependents)
            if (!dependentsMap.has(normResolved)) {
              dependentsMap.set(normResolved, []);
            }
            dependentsMap.get(normResolved)!.push(normalized);
          }
        }
      }

      dependencyMap.set(normalized, resolvedImports);

      // Detect if this is a test file
      if (this.isTestFile(normalized)) {
        // Associate with candidate source file
        const candidateSource = this.findSourceForTest(normalized);
        if (candidateSource) {
          if (!testFilesMap.has(candidateSource)) {
            testFilesMap.set(candidateSource, []);
          }
          testFilesMap.get(candidateSource)!.push(normalized);
        }
      }
    }

    return {
      files: files.map((f) => path.relative(this.workspaceRoot, f).replace(/\\/g, '/')),
      meta,
      dependencyMap,
      dependentsMap,
      testFilesMap,
    };
  }

  private async walkDir(dir: string, fileList: string[], maxFiles: number): Promise<void> {
    if (fileList.length >= maxFiles) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (fileList.length >= maxFiles) break;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) {
            await this.walkDir(fullPath, fileList, maxFiles);
          }
        } else if (entry.isFile()) {
          fileList.push(fullPath);
        }
      }
    } catch {
      // Permission errors or inaccessible files ignored
    }
  }

  private async detectProjectMeta(): Promise<ProjectMeta> {
    const meta: ProjectMeta = {
      name: path.basename(this.workspaceRoot),
      architecture: 'Generic Codebase',
      frameworks: [],
      dependencies: [],
      packageManager: 'unknown',
    };

    // Check package.json
    try {
      const pkgRaw = await fs.readFile(path.join(this.workspaceRoot, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      meta.name = pkg.name || meta.name;
      meta.packageManager = 'npm';

      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      meta.dependencies = [...deps, ...devDeps];

      const frameworks: string[] = [];
      if (deps.includes('react') || devDeps.includes('react')) frameworks.push('React');
      if (deps.includes('vue') || devDeps.includes('vue')) frameworks.push('Vue');
      if (deps.includes('express') || devDeps.includes('express')) frameworks.push('Express');
      if (deps.includes('next') || devDeps.includes('next')) frameworks.push('Next.js');
      if (deps.includes('vscode') || devDeps.includes('@types/vscode')) frameworks.push('VS Code Extension');
      if (devDeps.includes('typescript') || deps.includes('typescript')) frameworks.push('TypeScript');

      meta.frameworks = frameworks;
      if (frameworks.length > 0) {
        meta.architecture = frameworks.join(' + ');
      }
      return meta;
    } catch {
      // Fallback
    }

    // Check requirements.txt or pyproject.toml
    try {
      await fs.access(path.join(this.workspaceRoot, 'requirements.txt'));
      meta.architecture = 'Python Application';
      meta.frameworks.push('Python');
      meta.packageManager = 'pip';
      return meta;
    } catch {
      // Fallback
    }

    return meta;
  }

  private async extractImports(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const imports: string[] = [];

      // Matches ES6 imports: import ... from '...' or import '...'
      const es6Regex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = es6Regex.exec(content)) !== null) {
        if (match[1]) imports.push(match[1]);
      }

      // Matches CommonJS require('...')
      const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = cjsRegex.exec(content)) !== null) {
        if (match[1]) imports.push(match[1]);
      }

      return imports;
    } catch {
      return [];
    }
  }

  private resolveRelativeImport(dir: string, importPath: string, allFiles: string[]): string | null {
    // In TypeScript ESM, imports often use .js but source is .ts
    let cleanImport = importPath;
    if (cleanImport.endsWith('.js')) {
      cleanImport = cleanImport.slice(0, -3);
    }

    const base = path.resolve(dir, cleanImport);
    const candidateExtensions = ['.ts', '.tsx', '.js', '.jsx', '', '/index.ts', '/index.js'];

    const normalizedAll = new Map<string, string>();
    for (const f of allFiles) {
      normalizedAll.set(path.normalize(f).toLowerCase(), f);
    }

    for (const ext of candidateExtensions) {
      const full = path.normalize(base + ext).toLowerCase();
      if (normalizedAll.has(full)) {
        return normalizedAll.get(full)!;
      }
    }
    return null;
  }

  private isTestFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return (
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.includes('__tests__') ||
      lower.includes('/test/') ||
      lower.includes('/tests/')
    );
  }

  private findSourceForTest(testPath: string): string | null {
    // e.g. src/core/cache/CacheManager.test.ts -> src/core/cache/CacheManager.ts
    const cleaned = testPath.replace(/\.(test|spec)\./, '.');
    return cleaned !== testPath ? cleaned : null;
  }
}
