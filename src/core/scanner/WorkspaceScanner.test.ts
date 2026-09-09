import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceScanner } from './WorkspaceScanner.js';

describe('WorkspaceScanner', () => {
  const currentScanner = new WorkspaceScanner(process.cwd());

  it('scans the workspace files and identifies project architecture', async () => {
    const result = await currentScanner.scan(500);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.meta.name).toBe('nivora-context');
    expect(result.meta.frameworks).toContain('TypeScript');
    expect(result.meta.frameworks).toContain('VS Code Extension');
    expect(result.meta.architecture).toContain('VS Code Extension');
  });

  it('maps import dependencies between code files', async () => {
    const result = await currentScanner.scan(500);

    // src/extension.ts imports src/core/brain/ProjectBrain.js
    const extDeps = result.dependencyMap.get('src/extension.ts');
    expect(extDeps).toBeDefined();
    expect(extDeps).toContain('src/core/brain/ProjectBrain.ts');

    // And ProjectBrain.ts should have extension.ts in dependentsMap
    const dependents = result.dependentsMap.get('src/core/brain/ProjectBrain.ts');
    expect(dependents).toBeDefined();
    expect(dependents).toContain('src/extension.ts');
  });

  it('associates test files with candidate source files', async () => {
    const result = await currentScanner.scan(500);
    const tests = result.testFilesMap.get('src/core/cache/CacheManager.ts');
    expect(tests).toBeDefined();
    expect(tests).toContain('src/core/cache/CacheManager.test.ts');
  });

  describe('Multi-Language Support (Python, Go, FastApi, Rust)', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivora-multilang-test-'));
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    it('detects Python FastAPI architecture and dependencies', async () => {
      // Mock requirements.txt
      await fs.writeFile(
        path.join(tempDir, 'requirements.txt'),
        'fastapi==0.109.0\nuvicorn==0.27.0\nsqlalchemy==2.0.25\n',
        'utf-8'
      );

      // Mock app structure
      await fs.mkdir(path.join(tempDir, 'app/auth'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'app/auth/jwt.py'),
        'def create_token(): pass\n',
        'utf-8'
      );
      await fs.writeFile(
        path.join(tempDir, 'app/auth/routes.py'),
        'from app.auth.jwt import create_token\n',
        'utf-8'
      );
      await fs.writeFile(
        path.join(tempDir, 'app/auth/test_jwt.py'),
        'from app.auth.jwt import create_token\ndef test_token(): pass\n',
        'utf-8'
      );

      const scanner = new WorkspaceScanner(tempDir);
      const res = await scanner.scan(500);

      expect(res.meta.frameworks).toContain('Python');
      expect(res.meta.frameworks).toContain('FastAPI');
      expect(res.meta.frameworks).toContain('SQLAlchemy');
      expect(res.meta.architecture).toContain('FastAPI');

      // Check Python relative dependency mapping
      const routeDeps = res.dependencyMap.get('app/auth/routes.py');
      expect(routeDeps).toBeDefined();
      expect(routeDeps).toContain('app/auth/jwt.py');

      // Check reverse dependency (dependents)
      const jwtDependents = res.dependentsMap.get('app/auth/jwt.py');
      expect(jwtDependents).toBeDefined();
      expect(jwtDependents).toContain('app/auth/routes.py');

      // Check Python test file association
      const jwtTests = res.testFilesMap.get('app/auth/jwt.py');
      expect(jwtTests).toBeDefined();
      expect(jwtTests).toContain('app/auth/test_jwt.py');
    });

    it('detects Go Gin architecture', async () => {
      await fs.writeFile(
        path.join(tempDir, 'go.mod'),
        'module example.com/myapp\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\n',
        'utf-8'
      );

      const scanner = new WorkspaceScanner(tempDir);
      const res = await scanner.scan(500);

      expect(res.meta.frameworks).toContain('Go');
      expect(res.meta.frameworks).toContain('Gin');
      expect(res.meta.architecture).toContain('Gin');
    });
  });
});
