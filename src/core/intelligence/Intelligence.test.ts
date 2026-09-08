import { describe, it, expect, vi } from 'vitest';
import { FreshnessEngine } from './FreshnessEngine.js';
import { ConfidenceScorer } from './ConfidenceScorer.js';
import { RiskEngine } from './RiskEngine.js';
import { GitAnalyzer } from '../git/GitAnalyzer.js';
import { Decision } from '../../types/index.js';

describe('Intelligence Engine', () => {
  describe('FreshnessEngine', () => {
    it('detects stale decisions when commits have modified affected files since decision date', async () => {
      const mockGit = {
        getCommitsSince: vi.fn().mockResolvedValue([
          { hash: '1', shortHash: '1', author: 'Dev', date: '2026-08-01', relativeTime: '1 month ago', message: 'feat', files: [] },
          { hash: '2', shortHash: '2', author: 'Dev', date: '2026-08-10', relativeTime: '3 weeks ago', message: 'fix', files: [] },
          { hash: '3', shortHash: '3', author: 'Dev', date: '2026-08-15', relativeTime: '2 weeks ago', message: 'refactor', files: [] },
          { hash: '4', shortHash: '4', author: 'Dev', date: '2026-08-20', relativeTime: '1 week ago', message: 'update', files: [] },
          { hash: '5', shortHash: '5', author: 'Dev', date: '2026-08-25', relativeTime: '4 days ago', message: 'tweak', files: [] },
          { hash: '6', shortHash: '6', author: 'Dev', date: '2026-09-01', relativeTime: '2 days ago', message: 'changes', files: [] },
        ]),
      } as unknown as GitAnalyzer;

      const engine = new FreshnessEngine(mockGit);
      const decision: Decision = {
        id: 'ADR-014',
        title: 'Payment Adapter Pattern',
        reason: 'Provider isolation',
        date: '2026-05-01',
        affectedComponents: ['src/payments/payment.service.ts'],
        status: 'active',
        source: 'docs/adr/014.md',
        lastVerified: '2026-05-01',
      };

      const warning = await engine.checkDecisionFreshness(decision);
      expect(warning).not.toBeNull();
      expect(warning?.commitsSince).toBe(6);
      expect(warning?.severity).toBe('high');
      expect(warning?.message).toContain('6 commits have modified related components');
    });

    it('returns null for fresh decisions with zero subsequent churn', async () => {
      const mockGit = {
        getCommitsSince: vi.fn().mockResolvedValue([]),
      } as unknown as GitAnalyzer;

      const engine = new FreshnessEngine(mockGit);
      const todayStr = new Date().toISOString().split('T')[0];
      const decision: Decision = {
        id: 'ADR-099',
        title: 'Brand New Decision',
        reason: 'Freshness test',
        date: todayStr,
        affectedComponents: ['src/new.ts'],
        status: 'active',
        source: 'docs/adr/099.md',
        lastVerified: todayStr,
      };

      const warning = await engine.checkDecisionFreshness(decision);
      expect(warning).toBeNull();
    });
  });

  describe('ConfidenceScorer', () => {
    const scorer = new ConfidenceScorer();

    it('scores high confidence when ADR, tests, and fresh docs exist', () => {
      const score = scorer.calculate({
        freshnessScore: 100,
        hasDecisions: true,
        hasGitHistory: true,
        churnCommitCount: 2,
        hasTests: true,
        evidenceCount: 4,
      });

      expect(score.overall).toBeGreaterThanOrEqual(90);
      expect(score.explanation).toContain('governed by recorded architecture decisions');
      expect(score.explanation).toContain('verified by unit/integration tests');
    });

    it('penalizes confidence when tests are missing and docs are stale', () => {
      const score = scorer.calculate({
        freshnessScore: 40,
        hasDecisions: false,
        hasGitHistory: true,
        churnCommitCount: 8,
        hasTests: false,
        evidenceCount: 1,
      });

      expect(score.overall).toBeLessThan(65);
      expect(score.explanation).toContain('lacks dedicated automated test coverage');
      expect(score.explanation).toContain('affected by stale documentation');
    });
  });

  describe('RiskEngine', () => {
    const riskEngine = new RiskEngine();

    it('identifies high blast radius when imported by multiple components', () => {
      const risks = riskEngine.analyze({
        target: 'src/core/cache/CacheManager.ts',
        dependents: ['src/extension.ts', 'src/query.ts', 'src/worker.ts', 'src/api.ts'],
        tests: ['src/core/cache/CacheManager.test.ts'],
        staleWarnings: [],
        churnCommitCount: 2,
        decisions: [],
      });

      const blastRisk = risks.find((r) => r.id === 'risk-blast-radius-high');
      expect(blastRisk).toBeDefined();
      expect(blastRisk?.severity).toBe('high');
    });

    it('flags missing automated test coverage', () => {
      const risks = riskEngine.analyze({
        target: 'src/payments/untested.ts',
        dependents: ['src/index.ts'],
        tests: [],
        staleWarnings: [],
        churnCommitCount: 1,
        decisions: [],
      });

      const testRisk = risks.find((r) => r.id === 'risk-no-tests');
      expect(testRisk).toBeDefined();
    });
  });
});
