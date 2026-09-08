import { describe, it, expect } from 'vitest';
import { GitAnalyzer } from './GitAnalyzer.js';

describe('GitAnalyzer', () => {
  const analyzer = new GitAnalyzer(process.cwd());

  it('detects that the current workspace is a git repo', async () => {
    const isRepo = await analyzer.isRepo();
    expect(isRepo).toBe(true);
  });

  it('gets the current branch name', async () => {
    const branch = await analyzer.getCurrentBranch();
    expect(['main', 'master']).toContain(branch);
  });

  it('retrieves recent commits from the repository', async () => {
    const commits = await analyzer.getRecentCommits(5);
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]).toHaveProperty('hash');
    expect(commits[0]).toHaveProperty('author');
    expect(commits[0]).toHaveProperty('message');
  });

  it('retrieves history and churn for a tracked file', async () => {
    const churn = await analyzer.getFileChurn('README.md');
    expect(churn.path).toBe('README.md');
    expect(churn.commitCount).toBeGreaterThan(0);
    expect(churn.recentCommits.length).toBeGreaterThan(0);
  });

  it('detects changed and untracked files', async () => {
    const status = await analyzer.getChangedFiles();
    expect(status).toHaveProperty('modified');
    expect(status).toHaveProperty('untracked');
    expect(status).toHaveProperty('staged');
  });
});
