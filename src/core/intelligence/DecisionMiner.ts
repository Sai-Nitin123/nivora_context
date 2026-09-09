import { CommitInfo, Decision } from '../../types/index.js';
import { GitAnalyzer } from '../git/GitAnalyzer.js';

export class DecisionMiner {
  private gitAnalyzer: GitAnalyzer;

  // Patterns that indicate intentional architectural choices
  private static readonly ARCHITECTURAL_PATTERNS = [
    /(?:migrate|migrating)\s+(?:from\s+([a-zA-Z0-9_\-]+)\s+)?to\s+([a-zA-Z0-9_\-]+)/i,
    /(?:switch|switched)\s+(?:from\s+([a-zA-Z0-9_\-]+)\s+)?to\s+([a-zA-Z0-9_\-]+)/i,
    /(?:replace|replaced)\s+([a-zA-Z0-9_\-]+)\s+with\s+([a-zA-Z0-9_\-]+)/i,
    /(?:isolate|isolated|adapter|abstract)\s+([a-zA-Z0-9_\-]+)/i,
    /(?:refactor|redesign)\s+([a-zA-Z0-9_\-]+)\s+to\s+([a-zA-Z0-9_\-]+)/i,
    /^(?:feat|refactor|arch|perf)(?:\(([a-zA-Z0-9_\-]+)\))?!?:?\s*(.*)/i,
    /(?:decision|adr|rfc)[:\s\-]+(.*)/i,
    /(?:breaking\s*change|breaking)[:\s\-]+(.*)/i,
  ];

  constructor(gitAnalyzer: GitAnalyzer) {
    this.gitAnalyzer = gitAnalyzer;
  }

  /**
   * Scans Git commit history and extracts inferred architectural decisions
   */
  public async mineDecisions(limit = 60): Promise<Decision[]> {
    const isRepo = await this.gitAnalyzer.isRepo();
    if (!isRepo) return [];

    const commits = await this.gitAnalyzer.getRecentCommits(limit);
    const minedDecisions: Decision[] = [];
    const seenTitles = new Set<string>();

    let counter = 1;
    for (const commit of commits) {
      const decision = this.evaluateCommit(commit, counter);
      if (decision && !seenTitles.has(decision.title.toLowerCase())) {
        seenTitles.add(decision.title.toLowerCase());
        minedDecisions.push(decision);
        counter++;
      }
    }

    return minedDecisions;
  }

  /**
   * Evaluates a single commit message to see if it represents an architectural decision
   */
  public evaluateCommit(commit: CommitInfo, index: number): Decision | null {
    const msg = commit.message.trim();
    if (!msg || msg.length < 10) return null;

    for (const pattern of DecisionMiner.ARCHITECTURAL_PATTERNS) {
      const match = pattern.exec(msg);
      if (match) {
        const id = `GIT-${String(index).padStart(3, '0')}`;
        const title = this.formatTitle(msg);
        const reason = `Extracted from commit ${commit.shortHash} by ${commit.author}: "${msg}".`;

        return {
          id,
          title,
          reason,
          date: commit.date.split('T')[0] || new Date().toISOString().split('T')[0],
          affectedComponents: commit.files || [],
          status: 'active',
          source: `commit #${commit.shortHash}`,
          lastVerified: commit.date,
        };
      }
    }

    return null;
  }

  private formatTitle(msg: string): string {
    // Clean up conventional commit prefixes e.g. "feat(auth): add jwt rotation" -> "Add jwt rotation (auth)"
    const match = /^(?:feat|refactor|arch|perf|fix)(?:\(([a-zA-Z0-9_\-]+)\))?!?:\s*(.*)/i.exec(msg);
    if (match) {
      const scope = match[1] ? ` (${match[1]})` : '';
      const clean = match[2].charAt(0).toUpperCase() + match[2].slice(1);
      return `${clean}${scope}`;
    }
    return msg.charAt(0).toUpperCase() + msg.slice(1);
  }
}
