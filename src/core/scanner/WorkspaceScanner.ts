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

// Comprehensive list of build, cache, and virtualenv directories to ignore
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
  // Python
  'venv',
  '.venv',
  'env',
  '.env',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  'site-packages',
  // Rust
  'target',
  '.cargo',
  // Java / Kotlin / C# / C++
  'bin',
  'obj',
  '.gradle',
  '.mvn',
  // iOS / Android / Others
  'Pods',
  '.terraform',
  '.dart_tool',
]);

const CODE_EXTENSIONS = new Set([
  // JavaScript / TypeScript
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  // Python
  '.py', '.pyw',
  // Go
  '.go',
  // Rust
  '.rs',
  // Java / Kotlin / Scala
  '.java', '.kt', '.kts', '.scala',
  // C / C++
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
  // C#
  '.cs',
  // PHP
  '.php',
  // Ruby
  '.rb',
  // Swift
  '.swift',
  // Dart
  '.dart',
  // Shell
  '.sh', '.bash',
]);

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

    // Normalize all file paths relative to workspace root with forward slashes
    const normalizedFilesMap = new Map<string, string>();
    for (const f of files) {
      const rel = path.relative(this.workspaceRoot, f).replace(/\\/g, '/');
      normalizedFilesMap.set(rel.toLowerCase(), rel);
    }

    // Process code files for imports & dependencies
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!CODE_EXTENSIONS.has(ext)) continue;

      const normalized = path.relative(this.workspaceRoot, file).replace(/\\/g, '/');
      const importedPaths = await this.extractImports(file, ext);
      const resolvedImports: string[] = [];

      for (const imp of importedPaths) {
        const dir = path.dirname(file);
        const resolved = this.resolveImport(dir, imp, files, ext);
        if (resolved) {
          const normResolved = path.relative(this.workspaceRoot, resolved).replace(/\\/g, '/');
          resolvedImports.push(normResolved);

          // Add reverse mapping (dependents)
          if (!dependentsMap.has(normResolved)) {
            dependentsMap.set(normResolved, []);
          }
          if (!dependentsMap.get(normResolved)!.includes(normalized)) {
            dependentsMap.get(normResolved)!.push(normalized);
          }
        }
      }

      dependencyMap.set(normalized, resolvedImports);

      // Detect if this is a test file
      if (this.isTestFile(normalized)) {
        const candidateSource = this.findSourceForTest(normalized, normalizedFilesMap);
        if (candidateSource) {
          if (!testFilesMap.has(candidateSource)) {
            testFilesMap.set(candidateSource, []);
          }
          if (!testFilesMap.get(candidateSource)!.includes(normalized)) {
            testFilesMap.get(candidateSource)!.push(normalized);
          }
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
          if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            await this.walkDir(fullPath, fileList, maxFiles);
          }
        } else if (entry.isFile()) {
          fileList.push(fullPath);
        }
      }
    } catch {
      // Ignore unreadable or locked files
    }
  }

  public async detectProjectMeta(): Promise<ProjectMeta> {
    const meta: ProjectMeta = {
      name: path.basename(this.workspaceRoot),
      architecture: 'Generic Codebase',
      frameworks: [],
      dependencies: [],
      packageManager: 'unknown',
    };

    // 1. Check Node.js (package.json)
    try {
      const pkgRaw = await fs.readFile(path.join(this.workspaceRoot, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      meta.name = pkg.name || meta.name;
      meta.packageManager = 'npm';

      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      const allDeps = [...deps, ...devDeps];
      meta.dependencies = allDeps;

      const frameworks: string[] = [];
      if (allDeps.includes('react')) frameworks.push('React');
      if (allDeps.includes('vue')) frameworks.push('Vue');
      if (allDeps.includes('svelte')) frameworks.push('Svelte');
      if (allDeps.includes('angular') || allDeps.includes('@angular/core')) frameworks.push('Angular');
      if (allDeps.includes('next')) frameworks.push('Next.js');
      if (allDeps.includes('express')) frameworks.push('Express');
      if (allDeps.includes('fastify')) frameworks.push('Fastify');
      if (allDeps.includes('nestjs') || allDeps.includes('@nestjs/core')) frameworks.push('NestJS');
      if (allDeps.includes('vscode') || allDeps.includes('@types/vscode')) frameworks.push('VS Code Extension');
      if (allDeps.includes('typescript')) frameworks.push('TypeScript');

      meta.frameworks = frameworks;
      if (frameworks.length > 0) {
        meta.architecture = frameworks.join(' + ');
      }
      return meta;
    } catch {
      // Not a node project
    }

    // 2. Check Python (requirements.txt, pyproject.toml, Pipfile, setup.py)
    try {
      let pyContent = '';
      const pyFiles = ['pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.py'];
      for (const pf of pyFiles) {
        try {
          const content = await fs.readFile(path.join(this.workspaceRoot, pf), 'utf-8');
          pyContent += ' ' + content.toLowerCase();
          meta.packageManager = pf === 'Pipfile' ? 'pipenv' : pf === 'pyproject.toml' ? 'poetry/uv' : 'pip';
        } catch {
          // ignore
        }
      }

      if (pyContent) {
        const frameworks: string[] = ['Python'];
        if (pyContent.includes('fastapi')) frameworks.push('FastAPI');
        if (pyContent.includes('django')) frameworks.push('Django');
        if (pyContent.includes('flask')) frameworks.push('Flask');
        if (pyContent.includes('pytorch') || pyContent.includes('torch')) frameworks.push('PyTorch');
        if (pyContent.includes('tensorflow')) frameworks.push('TensorFlow');
        if (pyContent.includes('sqlalchemy')) frameworks.push('SQLAlchemy');
        if (pyContent.includes('pandas')) frameworks.push('Pandas');
        if (pyContent.includes('langchain')) frameworks.push('LangChain');

        meta.frameworks = frameworks;
        meta.architecture = frameworks.join(' + ');
        return meta;
      }
    } catch {
      // Not python
    }

    // 3. Check Go (go.mod)
    try {
      const goMod = await fs.readFile(path.join(this.workspaceRoot, 'go.mod'), 'utf-8');
      const frameworks = ['Go'];
      if (goMod.includes('gin-gonic')) frameworks.push('Gin');
      if (goMod.includes('gofiber')) frameworks.push('Fiber');
      if (goMod.includes('echo')) frameworks.push('Echo');
      meta.frameworks = frameworks;
      meta.architecture = frameworks.join(' + ');
      meta.packageManager = 'go';
      return meta;
    } catch {
      // Not Go
    }

    // 4. Check Rust (Cargo.toml)
    try {
      const cargo = await fs.readFile(path.join(this.workspaceRoot, 'Cargo.toml'), 'utf-8');
      const frameworks = ['Rust'];
      if (cargo.includes('actix')) frameworks.push('Actix');
      if (cargo.includes('axum')) frameworks.push('Axum');
      if (cargo.includes('tokio')) frameworks.push('Tokio');
      meta.frameworks = frameworks;
      meta.architecture = frameworks.join(' + ');
      meta.packageManager = 'cargo';
      return meta;
    } catch {
      // Not Rust
    }

    // 5. Check Java / Kotlin (pom.xml, build.gradle)
    try {
      const pom = await fs.readFile(path.join(this.workspaceRoot, 'pom.xml'), 'utf-8').catch(() => '');
      const gradle = await fs.readFile(path.join(this.workspaceRoot, 'build.gradle'), 'utf-8').catch(() => '');
      const jvmContent = pom + ' ' + gradle;
      if (jvmContent.trim()) {
        const frameworks = ['Java/JVM'];
        if (jvmContent.includes('spring-boot') || jvmContent.includes('springframework')) frameworks.push('Spring Boot');
        if (jvmContent.includes('quarkus')) frameworks.push('Quarkus');
        meta.frameworks = frameworks;
        meta.architecture = frameworks.join(' + ');
        meta.packageManager = pom ? 'maven' : 'gradle';
        return meta;
      }
    } catch {
      // Not Java
    }

    return meta;
  }

  public async extractImports(filePath: string, ext: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const imports: string[] = [];
      let match: RegExpExecArray | null;

      // JavaScript / TypeScript
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
        const es6Regex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
        while ((match = es6Regex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1]);
        }
        const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = cjsRegex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1]);
        }
      }

      // Python
      if (['.py', '.pyw'].includes(ext)) {
        // from .foo import bar / from ..foo import bar / from foo import bar
        const pyFromRegex = /from\s+(\.*[a-zA-Z0-9_\.]+)\s+import/g;
        while ((match = pyFromRegex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1]);
        }
        // import foo, bar
        const pyImportRegex = /^\s*import\s+([a-zA-Z0-9_\.,\s]+)/gm;
        while ((match = pyImportRegex.exec(content)) !== null) {
          const parts = match[1].split(',').map((p) => p.trim().split(/\s+/)[0]);
          for (const p of parts) {
            if (p) imports.push(p);
          }
        }
      }

      // Go
      if (ext === '.go') {
        const goBlockRegex = /import\s*\(\s*([\s\S]*?)\s*\)/g;
        let blockMatch: RegExpExecArray | null;
        while ((blockMatch = goBlockRegex.exec(content)) !== null) {
          const lines = blockMatch[1].match(/"([^"]+)"/g) || [];
          for (const l of lines) {
            imports.push(l.replace(/"/g, ''));
          }
        }
        const goSingleRegex = /import\s+"([^"]+)"/g;
        while ((match = goSingleRegex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1]);
        }
      }

      // Rust
      if (ext === '.rs') {
        const rustModRegex = /mod\s+([a-zA-Z0-9_]+);/g;
        while ((match = rustModRegex.exec(content)) !== null) {
          if (match[1]) imports.push(`./${match[1]}`);
        }
        const rustUseRegex = /use\s+(?:crate|super)::([a-zA-Z0-9_:]+);/g;
        while ((match = rustUseRegex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1].replace(/::/g, '/'));
        }
      }

      // C / C++
      if (['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].includes(ext)) {
        const cIncludeRegex = /#include\s+["<]([^">]+)[">]/g;
        while ((match = cIncludeRegex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1]);
        }
      }

      // C#
      if (ext === '.cs') {
        const csUsingRegex = /using\s+([a-zA-Z0-9_\.]+);/g;
        while ((match = csUsingRegex.exec(content)) !== null) {
          if (match[1]) imports.push(match[1]);
        }
      }

      return imports;
    } catch {
      return [];
    }
  }

  private resolveImport(dir: string, importPath: string, allFiles: string[], ext: string): string | null {
    // 1. JavaScript / TypeScript relative resolution
    if (importPath.startsWith('.')) {
      let cleanImport = importPath;
      if (cleanImport.endsWith('.js')) {
        cleanImport = cleanImport.slice(0, -3);
      }

      const base = path.resolve(dir, cleanImport);
      const candidateExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '', '/index.ts', '/index.js', '/__init__.py'];

      const normalizedAll = new Map<string, string>();
      for (const f of allFiles) {
        normalizedAll.set(path.normalize(f).toLowerCase(), f);
      }

      for (const candidateExt of candidateExtensions) {
        const full = path.normalize(base + candidateExt).toLowerCase();
        if (normalizedAll.has(full)) {
          return normalizedAll.get(full)!;
        }
      }
      return null;
    }

    // 2. Python relative imports (e.g. from .auth import jwt or from app.auth.jwt import verify)
    if (ext === '.py' || ext === '.pyw') {
      const normalizedAll = new Map<string, string>();
      for (const f of allFiles) {
        normalizedAll.set(path.normalize(f).toLowerCase(), f);
      }

      // Convert module notation (app.auth.jwt) to path (app/auth/jwt.py)
      const relativePath = importPath.replace(/\./g, '/');
      const candidatePaths = [
        path.resolve(this.workspaceRoot, relativePath + '.py'),
        path.resolve(this.workspaceRoot, relativePath + '/__init__.py'),
        path.resolve(dir, relativePath + '.py'),
      ];

      for (const cp of candidatePaths) {
        const norm = path.normalize(cp).toLowerCase();
        if (normalizedAll.has(norm)) {
          return normalizedAll.get(norm)!;
        }
      }
    }

    // 3. C / C++ relative includes (#include "header.h")
    if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) {
      const base = path.resolve(dir, importPath);
      for (const f of allFiles) {
        if (path.normalize(f).toLowerCase() === path.normalize(base).toLowerCase()) {
          return f;
        }
      }
    }

    return null;
  }

  private isTestFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    const basename = path.basename(lower);

    return (
      // Standard JS/TS
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.includes('__tests__') ||
      lower.includes('/test/') ||
      lower.includes('/tests/') ||
      // Python (test_*.py or *_test.py)
      basename.startsWith('test_') ||
      basename.endsWith('_test.py') ||
      // Go (*_test.go)
      basename.endsWith('_test.go') ||
      // Java / C# (*Test.java, *Tests.cs)
      basename.endsWith('test.java') ||
      basename.endsWith('tests.java') ||
      basename.endsWith('test.cs') ||
      basename.endsWith('tests.cs')
    );
  }

  private findSourceForTest(testPath: string, allFiles: Map<string, string>): string | null {
    const lower = testPath.toLowerCase();
    const dir = path.dirname(testPath);
    const basename = path.basename(testPath);

    // 1. JS/TS: foo.test.ts -> foo.ts
    const cleaned = testPath.replace(/\.(test|spec)\./, '.');
    if (cleaned !== testPath && allFiles.has(cleaned.toLowerCase())) {
      return allFiles.get(cleaned.toLowerCase())!;
    }

    // 2. Python: test_jwt.py -> jwt.py
    if (basename.startsWith('test_')) {
      const candidate = path.join(dir, basename.replace(/^test_/, '')).replace(/\\/g, '/');
      if (allFiles.has(candidate.toLowerCase())) {
        return allFiles.get(candidate.toLowerCase())!;
      }
    }

    // 3. Go: jwt_test.go -> jwt.go
    if (basename.endsWith('_test.go')) {
      const candidate = path.join(dir, basename.replace(/_test\.go$/, '.go')).replace(/\\/g, '/');
      if (allFiles.has(candidate.toLowerCase())) {
        return allFiles.get(candidate.toLowerCase())!;
      }
    }

    return null;
  }
}
