import { ContextCard } from '../../types/index.js';

export class AgentExporter {
  /**
   * Generates a ready-to-paste AI handoff prompt for any LLM or coding agent
   */
  public static toMarkdownHandoff(card: ContextCard): string {
    const lines: string[] = [];

    lines.push('# NIVORA PROJECT CONTEXT');
    lines.push('');
    lines.push(`**Target Component:** \`${card.target}\``);
    lines.push(`**Context Confidence:** ${card.confidence.overall}% (${card.confidence.explanation})`);
    lines.push(`**Generated:** ${card.generatedAt}`);
    lines.push('');

    lines.push('## 1. Purpose & Responsibilities');
    lines.push(card.purpose);
    lines.push('');

    if (card.relatedComponents.length > 0) {
      lines.push('## 2. Related & Dependent Components');
      for (const comp of card.relatedComponents) {
        lines.push(`- \`${comp}\``);
      }
      lines.push('');
    }

    if (card.decisions.length > 0) {
      lines.push('## 3. Architecture Decisions & Constraints (ADRs)');
      for (const d of card.decisions) {
        lines.push(`### [${d.id}] ${d.title} (Status: ${d.status.toUpperCase()})`);
        lines.push(`- **Reason:** ${d.reason}`);
        lines.push(`- **Source:** \`${d.source}\` (Recorded: ${d.date})`);
        if (d.affectedComponents.length > 0) {
          lines.push(`- **Affected:** ${d.affectedComponents.map((c) => `\`${c}\``).join(', ')}`);
        }
      }
      lines.push('');
    }

    if (card.recentChanges.length > 0) {
      lines.push('## 4. Recent Git Changes');
      for (const change of card.recentChanges) {
        lines.push(`- ${change}`);
      }
      lines.push('');
    }

    if (card.knownRisks.length > 0) {
      lines.push('## 5. Known Risks & Invariants');
      for (const risk of card.knownRisks) {
        const icon = risk.severity === 'high' ? '🚨' : risk.severity === 'medium' ? '⚠️' : 'ℹ️';
        lines.push(`- ${icon} **[${risk.severity.toUpperCase()}]** ${risk.description}`);
        if (risk.mitigation) {
          lines.push(`  - *Mitigation:* ${risk.mitigation}`);
        }
      }
      lines.push('');
    }

    if (card.staleWarnings.length > 0) {
      lines.push('## 6. Stale Knowledge Warnings');
      for (const warning of card.staleWarnings) {
        lines.push(`- ⚠️ **${warning.title}**: ${warning.message}`);
      }
      lines.push('');
    }

    if (card.tests.length > 0) {
      lines.push('## 7. Relevant Tests');
      for (const test of card.tests) {
        lines.push(`- \`${test}\``);
      }
      lines.push('');
    }

    if (card.symbols && card.symbols.length > 0) {
      lines.push('## 8. Exported Functions & Classes');
      for (const sym of card.symbols.slice(0, 10)) {
        lines.push(`- \`${sym.kind} ${sym.name}\` (Line ${sym.line})`);
      }
      lines.push('');
    }

    if (card.failedAttempts && card.failedAttempts.length > 0) {
      lines.push('## 9. ⚠️ Historical Failed Attempts (Do Not Repeat)');
      for (const fa of card.failedAttempts) {
        lines.push(`- **${fa.agent}** (${fa.date}): Attempted "${fa.attempted}" → *Failed:* ${fa.reason}`);
      }
      lines.push('');
    }

    if (card.evidence.length > 0) {
      lines.push('## 10. Verified Evidence Provenance');
      for (const ev of card.evidence) {
        lines.push(`- **[${ev.type.toUpperCase()}]** \`${ev.location}\`${ev.snippet ? `: ${ev.snippet}` : ''}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('## CONTINUE EXECUTION');
    lines.push('');
    lines.push('Do not restart from scratch or violate the architectural constraints documented above.');
    lines.push('1. Review the verified evidence and inspect referenced files.');
    lines.push('2. Adhere strictly to existing ADR decisions and invariant rules.');
    lines.push('3. Verify that changes preserve compatibility with dependent components.');
    lines.push('4. Run relevant tests before finalizing code modifications.');

    return lines.join('\n');
  }

  /**
   * Generates portable JSON NCTX schema
   */
  public static toNctxJson(card: ContextCard): string {
    return JSON.stringify(
      {
        schema: 'nctx-0.1',
        target: card.target,
        confidence: card.confidence,
        purpose: card.purpose,
        relatedComponents: card.relatedComponents,
        decisions: card.decisions,
        recentChanges: card.recentChanges,
        knownRisks: card.knownRisks,
        staleWarnings: card.staleWarnings,
        tests: card.tests,
        evidence: card.evidence,
        generatedAt: card.generatedAt,
      },
      null,
      2
    );
  }
}
