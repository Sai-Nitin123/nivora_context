import { describe, it, expect, vi } from 'vitest';
import { DecisionMiner } from './DecisionMiner.js';
import { GitAnalyzer } from '../git/GitAnalyzer.js';
import { CommitInfo } from '../../types/index.js';

describe('DecisionMiner', () => {
  it('identifies architectural choices from conventional commit messages', () => {
    const mockGit = {} as GitAnalyzer;
    const miner = new DecisionMiner(mockGit);

    const commit: CommitInfo = {
      hash: '8fa31c0000',
      shortHash: '8fa31c',
      author: 'Alex',
      date: '2026-09-08',
      relativeTime: '1 day ago',
      message: 'refactor(auth): switch from session cookies to jwt tokens',
      files: ['src/auth/jwt.ts', 'src/auth/session.ts'],
    };

    const decision = miner.evaluateCommit(commit, 1);
    expect(decision).not.toBeNull();
    expect(decision?.id).toBe('GIT-001');
    expect(decision?.title).toContain('Switch from session cookies to jwt tokens');
    expect(decision?.reason).toContain('8fa31c');
    expect(decision?.source).toBe('commit #8fa31c');
  });

  it('mines decisions from commit history', async () => {
    const mockGit = {
      isRepo: vi.fn().mockResolvedValue(true),
      getRecentCommits: vi.fn().mockResolvedValue([
        {
          hash: 'abc1',
          shortHash: 'abc1',
          author: 'Dev',
          date: '2026-09-01',
          relativeTime: '1 week ago',
          message: 'feat(payments): isolate stripe adapter behind interface',
          files: ['src/payments/stripe.ts'],
        },
        {
          hash: 'abc2',
          shortHash: 'abc2',
          author: 'Dev',
          date: '2026-09-02',
          relativeTime: '6 days ago',
          message: 'chore: update readme typo',
          files: ['README.md'],
        },
      ]),
    } as unknown as GitAnalyzer;

    const miner = new DecisionMiner(mockGit);
    const decisions = await miner.mineDecisions(10);

    expect(decisions.length).toBe(1);
    expect(decisions[0].title).toContain('Isolate stripe adapter behind interface');
  });
});
