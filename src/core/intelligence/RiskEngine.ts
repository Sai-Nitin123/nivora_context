import { Decision, RiskItem, StaleWarning } from '../../types/index.js';

export interface RiskAnalysisInput {
  target: string;
  dependents: string[];
  tests: string[];
  staleWarnings: StaleWarning[];
  churnCommitCount: number;
  decisions: Decision[];
}

export class RiskEngine {
  public analyze(input: RiskAnalysisInput): RiskItem[] {
    const risks: RiskItem[] = [];

    // 1. Blast Radius / Dependent Risk
    if (input.dependents.length >= 4) {
      risks.push({
        id: 'risk-blast-radius-high',
        severity: 'high',
        description: `High blast radius: Modifying this file directly impacts ${input.dependents.length} dependent components.`,
        affectedComponents: input.dependents,
        mitigation: `Verify and run test suites for all ${input.dependents.length} dependent modules before committing changes.`,
      });
    } else if (input.dependents.length >= 2) {
      risks.push({
        id: 'risk-blast-radius-med',
        severity: 'medium',
        description: `Shared component: Imported by ${input.dependents.length} other files.`,
        affectedComponents: input.dependents,
      });
    }

    // 2. Test Coverage Risk
    if (input.tests.length === 0) {
      const severity = input.dependents.length >= 2 ? 'high' : 'medium';
      risks.push({
        id: 'risk-no-tests',
        severity,
        description: 'No automated tests detected for this component.',
        affectedComponents: [input.target],
        mitigation: 'Add unit tests to safeguard against regressions prior to refactoring.',
      });
    }

    // 3. Stale Architecture Drift Risk
    if (input.staleWarnings.length > 0) {
      const topWarning = input.staleWarnings[0];
      risks.push({
        id: 'risk-stale-docs',
        severity: topWarning.severity,
        description: `Potential architecture drift: ${topWarning.message}`,
        affectedComponents: [input.target, topWarning.target],
        mitigation: 'Re-verify current code implementation against documented ADRs and architecture plans.',
      });
    }

    // 4. Architectural Constraints
    for (const decision of input.decisions) {
      if (decision.status === 'active') {
        risks.push({
          id: `risk-constraint-${decision.id}`,
          severity: 'medium',
          description: `Architectural Constraint (${decision.id}): "${decision.title}".`,
          affectedComponents: [input.target, ...decision.affectedComponents],
          mitigation: `Review ${decision.source}: ${decision.reason}`,
        });
      }
    }

    // 5. High Churn / Active Flux Risk
    if (input.churnCommitCount >= 6) {
      risks.push({
        id: 'risk-high-churn',
        severity: 'medium',
        description: `High volatility: Changed ${input.churnCommitCount} times in recent Git history.`,
        affectedComponents: [input.target],
        mitigation: 'Check latest git commit diffs to avoid overwriting recent parallel work.',
      });
    }

    return risks;
  }
}
