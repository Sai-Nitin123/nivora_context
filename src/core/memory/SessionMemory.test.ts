import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SessionMemory } from './SessionMemory.js';

describe('SessionMemory', () => {
  let tempDir: string;
  let memory: SessionMemory;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivora-mem-test-'));
    memory = new SessionMemory(tempDir);
    await memory.init();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('records and retrieves failed attempts for a file', async () => {
    await memory.recordFailedAttempt(
      'Claude',
      'Use stateful session cookies',
      'API clients are mobile apps that require bearer tokens',
      ['src/auth/jwt.ts']
    );

    const attempts = memory.getFailedAttemptsForFile('src/auth/jwt.ts');
    expect(attempts.length).toBe(1);
    expect(attempts[0].agent).toBe('Claude');
    expect(attempts[0].attempted).toContain('session cookies');
  });

  it('records manual decisions and writes ADR file', async () => {
    const dec = await memory.recordDecision(
      'Use PostgreSQL Transactions',
      'Guarantee ACID compliance across orders',
      ['src/orders/repo.ts']
    );

    expect(dec.id).toBe('ADR-001');
    expect(dec.title).toBe('Use PostgreSQL Transactions');

    // Verify written to disk
    const adrFile = path.join(tempDir, 'docs/adr/001-use-postgresql-transactions.md');
    const exists = await fs.access(adrFile).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});
