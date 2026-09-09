import * as fs from 'fs/promises';
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

    // 9. Formulate purpose with semantic & docstring extraction
    const purpose = await this.inferPurpose(relPath, directDependencies, relevantDecisions);

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

  private async inferPurpose(
    relPath: string,
    dependencies: string[],
    decisions: Decision[]
  ): Promise<string> {
    if (decisions.length > 0) {
      return decisions[0].reason;
    }

    // 1. Try reading docstring / top comment from file
    try {
      const fullPath = path.isAbsolute(relPath) ? relPath : path.join(this.workspaceRoot, relPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const docstring = this.extractTopDocstring(content);
      if (docstring) return docstring;
    } catch {
      // ignore
    }

    // 2. Semantic role classification across languages
    const lower = relPath.toLowerCase();
    const name = path.basename(relPath, path.extname(relPath));

    if (/auth|jwt|token|session|login|oauth|credential/i.test(lower)) {
      return `Authentication and identity verification module (${name}).`;
    }
    if (/payment|stripe|billing|checkout|invoice|transaction/i.test(lower)) {
      return `Payment processing and financial transaction module (${name}).`;
    }
    if (/controller|router|route|endpoint|api|view/i.test(lower)) {
      return `API routing and request dispatch layer (${name}).`;
    }
    if (/service|handler|manager/i.test(lower)) {
      return `Core business logic and service orchestration (${name}).`;
    }
    if (/model|schema|entity|dto/i.test(lower)) {
      return `Data schema and persistence entity definition (${name}).`;
    }
    if (/db|database|repository|repo|migration|dao/i.test(lower)) {
      return `Database persistence and query abstraction layer (${name}).`;
    }
    if (/middleware/i.test(lower)) {
      return `Request interceptor and HTTP middleware (${name}).`;
    }
    if (/util|helper|common|shared/i.test(lower)) {
      return `Shared utility and helper functions (${name}).`;
    }
    if (/worker|queue|job|task|cron/i.test(lower)) {
      return `Asynchronous background worker / queue processing (${name}).`;
    }
    if (/config|settings|env/i.test(lower)) {
      return `Application configuration and environment management (${name}).`;
    }
    if (/test|spec/i.test(lower)) {
      return `Automated test suite validating ${name}.`;
    }
    if (/cache/i.test(lower)) {
      return `Provides caching and persistence for ${name}.`;
    }
    if (/git/i.test(lower)) {
      return `Executes and manages Git analysis operations.`;
    }
    if (/scanner/i.test(lower)) {
      return `Scans and indexes workspace architecture.`;
    }
    if (/doc/i.test(lower)) {
      return `Discovers and parses documentation and ADRs.`;
    }
    if (/extension/i.test(lower)) {
      return `VS Code extension activation and command registration hub.`;
    }

    return `Source module: imports ${dependencies.length} local dependencies.`;
  }

  private extractTopDocstring(content: string): string | null {
    // Python docstring: """...""" or '''...'''
    const pyMatch = content.match(/^(?:#[^\r\n]*\r?\n)*\s*(?:"""|''')([\s\S]*?)(?:"""|''')/);
    if (pyMatch && pyMatch[1].trim()) {
      const firstLine = pyMatch[1].trim().split('\n')[0].trim();
      if (firstLine.length > 10) return firstLine;
    }

    // JSDoc / C-style block comment: /** ... */
    const jsDocMatch = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
    if (jsDocMatch && jsDocMatch[1].trim()) {
      const clean = jsDocMatch[1].replace(/^\s*\*\s?/gm, '').trim();
      const firstLine = clean.split('\n')[0].trim();
      if (firstLine.length > 10) return firstLine;
    }

    return null;
  }
}
