import * as path from 'path';
import {
  ContextCard,
  Decision,
  Evidence,
  StaleWarning,
} from '../../types/index.js';
import { CacheManager } from '../cache/CacheManager.js';
import { GitAnalyzer } from '../git/GitAnalyzer.js';
import { WorkspaceScanner } from '../scanner/WorkspaceScanner.js';
import { DocParser } from '../docs/DocParser.js';
import { FreshnessEngine } from '../intelligence/FreshnessEngine.js';
import { ConfidenceScorer } from '../intelligence/ConfidenceScorer.js';
import { RiskEngine } from '../intelligence/RiskEngine.js';

export class QueryEngine {
  private workspaceRoot: string;
  private cacheManager: CacheManager;
  private gitAnalyzer: GitAnalyzer;
  private scanner: WorkspaceScanner;
  private docParser: DocParser;
  private freshnessEngine: FreshnessEngine;
  private confidenceScorer: ConfidenceScorer;
  private riskEngine: RiskEngine;

  constructor(
    workspaceRoot: string,
    cacheManager: CacheManager,
    gitAnalyzer: GitAnalyzer,
    scanner: WorkspaceScanner,
    docParser: DocParser
  ) {
    this.workspaceRoot = workspaceRoot;
    this.cacheManager = cacheManager;
    this.gitAnalyzer = gitAnalyzer;
    this.scanner = scanner;
    this.docParser = docParser;
    this.freshnessEngine = new FreshnessEngine(gitAnalyzer);
    this.confidenceScorer = new ConfidenceScorer();
    this.riskEngine = new RiskEngine();
  }

  /**
   * The signature query: "What should I know before changing this?"
   */
  public async whatShouldIKnow(targetPath: string): Promise<ContextCard> {
    const relPath = path.isAbsolute(targetPath)
      ? path.relative(this.workspaceRoot, targetPath).replace(/\\/g, '/')
      : targetPath.replace(/\\/g, '/');

    // 1. Check in-memory/disk cache
    const cached = this.cacheManager.getContextCard(relPath);
    if (cached) {
      return cached;
    }

    // 2. Scan workspace dependencies
    const scanResult = await this.scanner.scan(1000);
    const relatedComponents = scanResult.dependentsMap.get(relPath) || [];
    const directDependencies = scanResult.dependencyMap.get(relPath) || [];
    const tests = scanResult.testFilesMap.get(relPath) || [];

    // 3. Git churn & recent commits
    const churn = await this.gitAnalyzer.getFileChurn(relPath);
    const recentChanges = churn.recentCommits.map(
      (c) => `[${c.shortHash}] ${c.message} (${c.relativeTime || c.date})`
    );

    // 4. Parse decisions & docs
    const { decisions } = await this.docParser.parseAll(scanResult.files);
    const relevantDecisions = this.findRelevantDecisions(relPath, decisions);

    // 5. Check staleness of related decisions
    const staleWarnings: StaleWarning[] = [];
    for (const d of relevantDecisions) {
      const warning = await this.freshnessEngine.checkDecisionFreshness(d, relPath);
      if (warning) {
        staleWarnings.push(warning);
      }
    }
    const freshnessScore = this.freshnessEngine.calculateFreshnessScore(staleWarnings);

    // 6. Risk analysis
    const knownRisks = this.riskEngine.analyze({
      target: relPath,
      dependents: relatedComponents,
      tests,
      staleWarnings,
      churnCommitCount: churn.commitCount,
      decisions: relevantDecisions,
    });

    // 7. Evidence gathering
    const evidence: Evidence[] = [];
    evidence.push({
      type: 'file',
      location: relPath,
      snippet: `Source module with ${directDependencies.length} dependencies and ${relatedComponents.length} dependents`,
    });

    if (churn.recentCommits.length > 0) {
      evidence.push({
        type: 'git',
        location: churn.recentCommits[0].hash,
        snippet: `Last modified by ${churn.recentCommits[0].author}: "${churn.recentCommits[0].message}"`,
        timestamp: churn.lastModified,
      });
    }

    for (const d of relevantDecisions) {
      evidence.push({
        type: 'doc',
        location: d.source,
        snippet: `${d.id}: ${d.title} (${d.reason})`,
        timestamp: d.date,
      });
    }

    // 8. Confidence scoring
    const confidence = this.confidenceScorer.calculate({
      freshnessScore,
      hasDecisions: relevantDecisions.length > 0,
      hasGitHistory: churn.commitCount > 0,
      churnCommitCount: churn.commitCount,
      hasTests: tests.length > 0,
      evidenceCount: evidence.length,
    });

    // 9. Formulate purpose
    const purpose = this.inferPurpose(relPath, directDependencies, relevantDecisions);

    const card: ContextCard = {
      target: relPath,
      purpose,
      relatedComponents,
      recentChanges,
      decisions: relevantDecisions,
      knownRisks,
      staleWarnings,
      confidence,
      evidence,
      tests,
      generatedAt: new Date().toISOString(),
    };

    // Cache the card for sub-millisecond retrieval
    await this.cacheManager.setContextCard(relPath, card);

    return card;
  }

  private findRelevantDecisions(relPath: string, decisions: Decision[]): Decision[] {
    const filename = path.basename(relPath);
    const nameWithoutExt = path.basename(relPath, path.extname(relPath));

    return decisions.filter((d) => {
      // 1. Direct affected components match
      if (
        d.affectedComponents.some(
          (c) =>
            c.toLowerCase().includes(filename.toLowerCase()) ||
            c.toLowerCase().includes(nameWithoutExt.toLowerCase()) ||
            relPath.toLowerCase().includes(c.toLowerCase())
        )
      ) {
        return true;
      }
      // 2. Reason or title mentions file
      if (
        d.title.toLowerCase().includes(nameWithoutExt.toLowerCase()) ||
        d.reason.toLowerCase().includes(nameWithoutExt.toLowerCase())
      ) {
        return true;
      }
      return false;
    });
  }

  private inferPurpose(relPath: string, dependencies: string[], decisions: Decision[]): string {
    if (decisions.length > 0) {
      return decisions[0].reason;
    }
    const name = path.basename(relPath, path.extname(relPath));
    if (relPath.includes('cache')) return `Provides caching and persistence for ${name}.`;
    if (relPath.includes('git')) return `Executes and manages Git analysis operations.`;
    if (relPath.includes('scanner')) return `Scans and indexes workspace architecture.`;
    if (relPath.includes('doc')) return `Discovers and parses documentation and ADRs.`;
    if (relPath.includes('test')) return `Automated test suite validating ${name}.`;
    if (relPath.includes('extension')) return `VS Code extension activation and command registration hub.`;
    return `Core module: imports ${dependencies.length} local dependencies.`;
  }
}
