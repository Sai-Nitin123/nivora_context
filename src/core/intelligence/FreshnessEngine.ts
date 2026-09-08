import { Decision, StaleWarning } from '../../types/index.js';
import { GitAnalyzer } from '../git/GitAnalyzer.js';

export class FreshnessEngine {
  private gitAnalyzer: GitAnalyzer;

  constructor(gitAnalyzer: GitAnalyzer) {
    this.gitAnalyzer = gitAnalyzer;
  }

  /**
   * Checks whether decisions or documentation related to a component are stale
   */
  public async checkDecisionFreshness(
    decision: Decision,
    componentPath?: string
  ): Promise<StaleWarning | null> {
    const now = new Date();
    const decisionDate = new Date(decision.date);
    const ageDays = Math.max(0, Math.floor((now.getTime() - decisionDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Target files to check git churn against
    const targets = componentPath
      ? [componentPath]
      : decision.affectedComponents.length > 0
      ? decision.affectedComponents
      : [decision.source];

    let commitsSince = 0;
    for (const target of targets) {
      const commits = await this.gitAnalyzer.getCommitsSince(target, decision.date);
      commitsSince += commits.length;
    }

    // Evaluate staleness threshold:
    // If more than 5 commits happened since the decision, or it's > 45 days old with any commits
    if (commitsSince >= 5 || (ageDays > 45 && commitsSince > 0)) {
      return {
        id: `stale-${decision.id}`,
        title: `${decision.id}: ${decision.title}`,
        target: decision.source,
        lastVerified: decision.lastVerified,
        ageDays,
        commitsSince,
        severity: commitsSince >= 10 || ageDays > 60 ? 'high' : 'medium',
        message: `Decision was recorded ${ageDays} days ago. Since then, ${commitsSince} commits have modified related components.`,
      };
    }

    if (ageDays > 90) {
      return {
        id: `stale-aged-${decision.id}`,
        title: `${decision.id}: ${decision.title}`,
        target: decision.source,
        lastVerified: decision.lastVerified,
        ageDays,
        commitsSince,
        severity: 'low',
        message: `Decision is ${ageDays} days old. It should be reviewed to ensure architecture alignment.`,
      };
    }

    return null;
  }

  /**
   * Calculates overall freshness percentage (0 - 100) based on warnings
   */
  public calculateFreshnessScore(warnings: StaleWarning[]): number {
    if (warnings.length === 0) return 100;

    let penalty = 0;
    for (const w of warnings) {
      if (w.severity === 'high') penalty += 30;
      else if (w.severity === 'medium') penalty += 15;
      else penalty += 5;
    }

    return Math.max(20, 100 - penalty);
  }
}
