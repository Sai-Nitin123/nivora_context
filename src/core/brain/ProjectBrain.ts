import * as path from 'path';
import {
  ContextCard,
  Decision,
  Fact,
  ProjectBrainState,
  RiskItem,
  StaleWarning,
} from '../../types/index.js';
import { CacheManager } from '../cache/CacheManager.js';
import { GitAnalyzer } from '../git/GitAnalyzer.js';
import { WorkspaceScanner } from '../scanner/WorkspaceScanner.js';
import { DocParser } from '../docs/DocParser.js';
import { QueryEngine, QueryResult } from '../query/QueryEngine.js';
import { FreshnessEngine } from '../intelligence/FreshnessEngine.js';

export class ProjectBrain {
  private workspaceRoot: string;
  public cacheManager: CacheManager;
  public gitAnalyzer: GitAnalyzer;
  public scanner: WorkspaceScanner;
  public docParser: DocParser;
  public queryEngine: QueryEngine;
  private freshnessEngine: FreshnessEngine;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cacheManager = new CacheManager(workspaceRoot);
    this.gitAnalyzer = new GitAnalyzer(workspaceRoot);
    this.scanner = new WorkspaceScanner(workspaceRoot);
    this.docParser = new DocParser(workspaceRoot);
    this.queryEngine = new QueryEngine(
      workspaceRoot,
      this.cacheManager,
      this.gitAnalyzer,
      this.scanner,
      this.docParser
    );
    this.freshnessEngine = new FreshnessEngine(this.gitAnalyzer);
  }

  public async init(): Promise<void> {
    await this.cacheManager.init();
    await this.queryEngine.init();
  }

  /**
   * Performs full asynchronous project scan and builds brain state
   */
  public async sync(): Promise<ProjectBrainState> {
    const scan = await this.scanner.scan(2000);
    const { decisions: docDecisions } = await this.docParser.parseAll(scan.files);
    const minedDecisions = await this.queryEngine.decisionMiner.mineDecisions(40);
    const memoryDecisions = this.queryEngine.sessionMemory.getAllDecisions();
    const allDecisions = [...docDecisions, ...memoryDecisions, ...minedDecisions];

    // Evaluate project-wide stale knowledge
    const staleKnowledge: StaleWarning[] = [];
    for (const d of allDecisions) {
      const warning = await this.freshnessEngine.checkDecisionFreshness(d);
      if (warning) {
        staleKnowledge.push(warning);
      }
    }

    // High-level architectural facts
    const facts: Fact[] = [
      {
        id: 'fact-arch',
        content: `Architecture: ${scan.meta.architecture}`,
        sources: ['package configs'],
        confidence: 0.95,
        lastVerified: new Date().toISOString(),
      },
      {
        id: 'fact-files',
        content: `Workspace contains ${scan.files.length} indexed source files.`,
        sources: ['workspace filesystem'],
        confidence: 1.0,
        lastVerified: new Date().toISOString(),
      },
    ];

    if (scan.meta.dependencies.length > 0) {
      facts.push({
        id: 'fact-deps',
        content: `Dependencies include ${scan.meta.dependencies.slice(0, 6).join(', ')}.`,
        sources: ['package config'],
        confidence: 0.98,
        lastVerified: new Date().toISOString(),
      });
    }

    // High-level risks
    const risks: RiskItem[] = [];
    if (staleKnowledge.length > 0) {
      risks.push({
        id: 'risk-project-stale',
        severity: 'medium',
        description: `${staleKnowledge.length} architectural decisions show signs of staleness/drift.`,
        affectedComponents: staleKnowledge.map((s) => s.target),
        mitigation: 'Review recorded ADRs against recent Git commit modifications.',
      });
    }

    // Calculate overall health score (0 - 100)
    let health = 100;
    for (const w of staleKnowledge) {
      health -= w.severity === 'high' ? 12 : w.severity === 'medium' ? 6 : 2;
    }
    health = Math.max(30, Math.min(100, health));

    const brainState: ProjectBrainState = {
      projectName: scan.meta.name,
      architecture: scan.meta.architecture,
      overallHealth: health,
      filesCount: scan.files.length,
      facts,
      decisions: allDecisions,
      risks,
      staleKnowledge,
      lastScanned: new Date().toISOString(),
    };

    await this.cacheManager.setBrainState(brainState);
    return brainState;
  }

  public async whatShouldIKnow(targetPath: string): Promise<ContextCard> {
    return this.queryEngine.whatShouldIKnow(targetPath);
  }

  public async ask(query: string): Promise<QueryResult> {
    return this.queryEngine.ask(query);
  }

  public async recordDecision(title: string, reason: string, affectedFiles?: string[]): Promise<Decision> {
    return this.queryEngine.sessionMemory.recordDecision(title, reason, affectedFiles);
  }

  public async recordFailedAttempt(agent: string, attempted: string, reason: string, affectedFiles?: string[]) {
    return this.queryEngine.sessionMemory.recordFailedAttempt(agent, attempted, reason, affectedFiles);
  }

  public getState(): ProjectBrainState | null {
    return this.cacheManager.getBrainState();
  }
}
