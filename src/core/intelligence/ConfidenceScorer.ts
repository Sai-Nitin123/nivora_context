import { ConfidenceScore } from '../../types/index.js';

export interface ConfidenceInput {
  freshnessScore: number; // 0 - 100
  hasDecisions: boolean;
  hasGitHistory: boolean;
  churnCommitCount: number;
  hasTests: boolean;
  evidenceCount: number;
}

export class ConfidenceScorer {
  /**
   * Computes an evidence-grounded confidence score (0 - 100%)
   */
  public calculate(input: ConfidenceInput): ConfidenceScore {
    // 1. Provenance: based on ADRs, git provenance, and verified references
    let provenanceScore = 30;
    if (input.hasDecisions) provenanceScore += 35;
    if (input.hasGitHistory) provenanceScore += 20;
    provenanceScore += Math.min(15, input.evidenceCount * 3);
    provenanceScore = Math.min(100, provenanceScore);

    // 2. Test Verification: whether automated tests safeguard this component
    const testScore = input.hasTests ? 100 : 45;

    // 3. Churn Stability: high commit churn indicates volatility
    let churnFactor = 0.1;
    let churnStability = 100;
    if (input.churnCommitCount > 10) {
      churnStability = 60;
      churnFactor = 0.7;
    } else if (input.churnCommitCount > 4) {
      churnStability = 80;
      churnFactor = 0.4;
    }

    // 4. Weighted Aggregate
    const overall = Math.min(
      99,
      Math.max(
        20,
        Math.round(
          input.freshnessScore * 0.35 +
          provenanceScore * 0.35 +
          testScore * 0.20 +
          churnStability * 0.10
        )
      )
    );

    // Generate human explanation
    const reasons: string[] = [];
    if (input.hasDecisions) reasons.push('governed by recorded architecture decisions');
    if (input.hasTests) reasons.push('verified by unit/integration tests');
    else reasons.push('lacks dedicated automated test coverage');
    if (input.freshnessScore < 70) reasons.push('affected by stale documentation');
    if (input.churnCommitCount > 5) reasons.push('undergoing rapid commit churn');

    const explanation = reasons.length > 0
      ? `Confidence of ${overall}%: ${reasons.join(', ')}.`
      : `Baseline confidence of ${overall}% based on source code and git presence.`;

    return {
      overall,
      freshnessScore: input.freshnessScore,
      provenanceCount: input.evidenceCount,
      churnFactor,
      explanation,
    };
  }
}
