/**
 * Nivora Context — Core Domain Models & Types
 * Based on UPGRADE.md (The Project Brain)
 */

export type KnowledgeType = 'fact' | 'decision' | 'inference' | 'risk' | 'change' | 'stale_warning';

export interface Evidence {
  type: 'file' | 'git' | 'doc' | 'config';
  location: string; // File path, line number, or commit hash
  snippet?: string;
  timestamp?: string;
}

export interface Fact {
  id: string;
  content: string;
  sources: string[];
  confidence: number; // 0.0 - 1.0
  lastVerified: string;
}

export interface Decision {
  id: string; // e.g. "ADR-014" or "DEC-001"
  title: string;
  reason: string;
  date: string;
  affectedComponents: string[];
  status: 'active' | 'superseded' | 'deprecated';
  source: string; // File path where the ADR or decision is documented
  lastVerified: string;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  relativeTime: string;
  message: string;
  files: string[];
}

export interface FileChurn {
  path: string;
  commitCount: number;
  lastModified: string;
  recentCommits: CommitInfo[];
}

export interface StaleWarning {
  id: string;
  title: string;
  target: string;
  lastVerified: string;
  ageDays: number;
  commitsSince: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface RiskItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedComponents: string[];
  mitigation?: string;
  evidence?: Evidence[];
}

export interface ConfidenceScore {
  overall: number; // 0 - 100
  freshnessScore: number; // 0 - 100
  provenanceCount: number;
  churnFactor: number; // 0 - 1.0
  explanation: string;
}

/**
 * The signature Nivora UX primitive: Context Card
 * Answers: "What should I know before changing this?"
 */
export interface ContextCard {
  target: string; // Target file or component
  purpose: string;
  relatedComponents: string[];
  recentChanges: string[];
  decisions: Decision[];
  knownRisks: RiskItem[];
  staleWarnings: StaleWarning[];
  confidence: ConfidenceScore;
  evidence: Evidence[];
  tests: string[];
  generatedAt: string;
}

export interface ProjectBrainState {
  projectName: string;
  architecture: string;
  overallHealth: number; // 0 - 100
  filesCount: number;
  facts: Fact[];
  decisions: Decision[];
  risks: RiskItem[];
  staleKnowledge: StaleWarning[];
  lastScanned: string;
}
