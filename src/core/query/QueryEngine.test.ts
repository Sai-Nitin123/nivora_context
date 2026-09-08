import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectBrain } from '../brain/ProjectBrain.js';
import { AgentExporter } from '../export/AgentExporter.js';

describe('QueryEngine & ProjectBrain', () => {
  let tempDir: string;
  let brain: ProjectBrain;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivora-query-test-'));

    // Create a mock repo structure
    await fs.mkdir(path.join(tempDir, 'src/payments'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'docs/adr'), { recursive: true });

    // Payment service
    await fs.writeFile(
      path.join(tempDir, 'src/payments/payment.service.ts'),
      `export class PaymentService {
  process() { return true; }
}`,
      'utf-8'
    );

    // Controller depending on payment service
    await fs.writeFile(
      path.join(tempDir, 'src/payments/payment.controller.ts'),
      `import { PaymentService } from './payment.service.js';
export class PaymentController {}`,
      'utf-8'
    );

    // ADR-014
    await fs.writeFile(
      path.join(tempDir, 'docs/adr/014-adapter.md'),
      `---
id: ADR-014
title: Payment providers use adapter pattern
status: active
date: 2026-05-14
reason: Allow provider replacement without modifying business logic.
affected:
  - payment.service.ts
---

# ADR-014: Payment providers use adapter pattern
`,
      'utf-8'
    );

    brain = new ProjectBrain(tempDir);
    await brain.init();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('runs "whatShouldIKnow" and returns an evidence-backed context card', async () => {
    const card = await brain.whatShouldIKnow('src/payments/payment.service.ts');

    expect(card.target).toBe('src/payments/payment.service.ts');
    expect(card.relatedComponents).toContain('src/payments/payment.controller.ts');
    expect(card.decisions.length).toBeGreaterThan(0);
    expect(card.decisions[0].id).toBe('ADR-014');
    expect(card.purpose).toContain('Allow provider replacement');
    expect(card.confidence.overall).toBeGreaterThan(0);
    expect(card.evidence.length).toBeGreaterThan(0);
  });

  it('formats context card into markdown AI handoff prompt', async () => {
    const card = await brain.whatShouldIKnow('src/payments/payment.service.ts');
    const md = AgentExporter.toMarkdownHandoff(card);

    expect(md).toContain('# NIVORA PROJECT CONTEXT');
    expect(md).toContain('**Target Component:** `src/payments/payment.service.ts`');
    expect(md).toContain('ADR-014');
    expect(md).toContain('CONTINUE EXECUTION');
  });
});
