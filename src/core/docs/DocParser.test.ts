import { describe, it, expect } from 'vitest';
import { DocParser } from './DocParser.js';

describe('DocParser', () => {
  const parser = new DocParser(process.cwd());

  it('parses standard markdown documents into sections', async () => {
    const result = await parser.parseAll(['README.md']);
    expect(result.docs.length).toBe(1);
    expect(result.docs[0].path).toBe('README.md');
    expect(result.docs[0].sections.length).toBeGreaterThan(0);
  });

  it('parses an ADR with YAML frontmatter correctly', () => {
    const sampleAdr = `---
id: ADR-014
title: Payment providers use adapter pattern
status: active
date: 2026-05-14
reason: Allow provider replacement without modifying business logic.
affected:
  - PaymentService
  - StripeAdapter
---

# ADR-014: Payment providers use adapter pattern
## Context
We need to support multiple payment gateways.
`;
    const parsed = parser.parseDecision('docs/adr/014-adapter.md', sampleAdr, '2026-09-08T00:00:00.000Z');
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('ADR-014');
    expect(parsed?.title).toBe('Payment providers use adapter pattern');
    expect(parsed?.status).toBe('active');
    expect(parsed?.affectedComponents).toEqual(['PaymentService', 'StripeAdapter']);
    expect(parsed?.reason).toContain('Allow provider replacement');
  });

  it('parses an ADR using standard markdown headers', () => {
    const standardAdr = `# ADR-002: PostgreSQL as Primary Database

## Status
Accepted

Date: 2026-04-10

## Context
We need relational transactional consistency across orders.

## Consequences
All transactions use \`OrderRepository\` and \`database.ts\`.
`;
    const parsed = parser.parseDecision('docs/adr/002-postgres.md', standardAdr, '2026-09-08T00:00:00.000Z');
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('ADR-002');
    expect(parsed?.title).toBe('PostgreSQL as Primary Database');
    expect(parsed?.status).toBe('active');
    expect(parsed?.affectedComponents).toContain('OrderRepository');
    expect(parsed?.affectedComponents).toContain('database.ts');
  });
});
