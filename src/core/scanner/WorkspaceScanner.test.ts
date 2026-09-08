import { describe, it, expect } from 'vitest';
import { WorkspaceScanner } from './WorkspaceScanner.js';

describe('WorkspaceScanner', () => {
  const scanner = new WorkspaceScanner(process.cwd());

  it('scans the workspace files and identifies project architecture', async () => {
    const result = await scanner.scan(500);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.meta.name).toBe('nivora-context');
    expect(result.meta.frameworks).toContain('TypeScript');
    expect(result.meta.frameworks).toContain('VS Code Extension');
    expect(result.meta.architecture).toContain('VS Code Extension');
  });

  it('maps import dependencies between code files', async () => {
    const result = await scanner.scan(500);

    // src/extension.ts imports src/core/cache/CacheManager.js
    const extDeps = result.dependencyMap.get('src/extension.ts');
    expect(extDeps).toBeDefined();
    expect(extDeps).toContain('src/core/cache/CacheManager.ts');

    // And CacheManager.ts should have extension.ts in dependentsMap
    const dependents = result.dependentsMap.get('src/core/cache/CacheManager.ts');
    expect(dependents).toBeDefined();
    expect(dependents).toContain('src/extension.ts');
  });

  it('associates test files with candidate source files', async () => {
    const result = await scanner.scan(500);
    const tests = result.testFilesMap.get('src/core/cache/CacheManager.ts');
    expect(tests).toBeDefined();
    expect(tests).toContain('src/core/cache/CacheManager.test.ts');
  });
});
