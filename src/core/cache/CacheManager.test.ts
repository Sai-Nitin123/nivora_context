import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CacheManager } from './CacheManager.js';
import { ContextCard, ProjectBrainState } from '../../types/index.js';

describe('CacheManager', () => {
  let tempDir: string;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivora-test-'));
    cacheManager = new CacheManager(tempDir);
    await cacheManager.init();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('initializes with null brain state and empty cards', () => {
    expect(cacheManager.getBrainState()).toBeNull();
    expect(cacheManager.getContextCard('some/file.ts')).toBeNull();
  });

  it('stores and retrieves project brain state', async () => {
    const mockState: ProjectBrainState = {
      projectName: 'test-project',
      architecture: 'Node.js + TypeScript',
      overallHealth: 92,
      filesCount: 15,
      facts: [],
      decisions: [],
      risks: [],
      staleKnowledge: [],
      lastScanned: new Date().toISOString(),
    };

    await cacheManager.setBrainState(mockState);
    expect(cacheManager.getBrainState()).toEqual(mockState);

    // Flush to disk
    await cacheManager.flush();

    // Re-initialize a new CacheManager on same directory
    const newCacheManager = new CacheManager(tempDir);
    await newCacheManager.init();
    expect(newCacheManager.getBrainState()).toEqual(mockState);
  });

  it('stores and retrieves context cards with normalized paths', async () => {
    const mockCard: ContextCard = {
      target: 'src/payments/payment.service.ts',
      purpose: 'Handles payments',
      relatedComponents: ['StripeAdapter'],
      recentChanges: ['Commit #123'],
      decisions: [],
      knownRisks: [],
      staleWarnings: [],
      confidence: {
        overall: 88,
        freshnessScore: 90,
        provenanceCount: 3,
        churnFactor: 0.2,
        explanation: 'High confidence based on tests and recent ADR',
      },
      evidence: [],
      tests: ['payment.service.spec.ts'],
      generatedAt: new Date().toISOString(),
    };

    const target = path.join(tempDir, 'src/payments/payment.service.ts');
    await cacheManager.setContextCard(target, mockCard);

    expect(cacheManager.getContextCard(target)).toEqual(mockCard);
  });
});
