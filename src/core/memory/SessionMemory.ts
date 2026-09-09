import * as fs from 'fs/promises';
import * as path from 'path';
import { Decision } from '../../types/index.js';

export interface FailedAttempt {
  id: string;
  agent: string; // e.g. "Claude", "Cursor", "Developer", "Gemini"
  date: string;
  attempted: string;
  reason: string;
  affectedFiles: string[];
}

export interface StoredSessionMemory {
  version: string;
  updatedAt: string;
  failedAttempts: FailedAttempt[];
  manualDecisions: Decision[];
  activeConstraints: string[];
}

export class SessionMemory {
  private workspaceRoot: string;
  private memoryDir: string;
  private memoryFile: string;
  private state: StoredSessionMemory;
  private isDirty = false;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.memoryDir = path.join(workspaceRoot, '.nivora');
    this.memoryFile = path.join(this.memoryDir, 'session_memory.json');
    this.state = {
      version: '0.2.0',
      updatedAt: new Date().toISOString(),
      failedAttempts: [],
      manualDecisions: [],
      activeConstraints: [],
    };
  }

  public async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.memoryFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.version) {
        this.state = parsed;
      }
    } catch {
      // fresh state
    }
  }

  public async recordFailedAttempt(
    agent: string,
    attempted: string,
    reason: string,
    affectedFiles: string[] = []
  ): Promise<FailedAttempt> {
    const item: FailedAttempt = {
      id: `fail-${Date.now()}`,
      agent,
      date: new Date().toISOString().split('T')[0],
      attempted,
      reason,
      affectedFiles: affectedFiles.map((f) => f.replace(/\\/g, '/')),
    };

    this.state.failedAttempts.unshift(item);
    if (this.state.failedAttempts.length > 20) {
      this.state.failedAttempts = this.state.failedAttempts.slice(0, 20);
    }
    this.state.updatedAt = new Date().toISOString();
    this.isDirty = true;
    await this.flush();
    return item;
  }

  public async recordDecision(
    title: string,
    reason: string,
    affectedFiles: string[] = []
  ): Promise<Decision> {
    const count = this.state.manualDecisions.length + 1;
    const id = `ADR-${String(count).padStart(3, '0')}`;
    const date = new Date().toISOString().split('T')[0];

    const decision: Decision = {
      id,
      title,
      reason,
      date,
      affectedComponents: affectedFiles.map((f) => f.replace(/\\/g, '/')),
      status: 'active',
      source: `.nivora/session_memory.json`,
      lastVerified: new Date().toISOString(),
    };

    this.state.manualDecisions.unshift(decision);
    this.state.updatedAt = new Date().toISOString();
    this.isDirty = true;

    // Also write a markdown ADR to docs/adr/ if directory exists
    try {
      const adrDir = path.join(this.workspaceRoot, 'docs', 'adr');
      await fs.mkdir(adrDir, { recursive: true });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const filename = `${String(count).padStart(3, '0')}-${slug}.md`;
      const adrContent = `---
id: ${id}
title: ${title}
status: active
date: ${date}
reason: ${reason}
affected:
${affectedFiles.map((f) => `  - ${f}`).join('\n')}
---

# ${id}: ${title}

## Status
Active (Recorded: ${date})

## Context & Reason
${reason}

## Affected Components
${affectedFiles.map((f) => `- \`${f}\``).join('\n')}
`;
      await fs.writeFile(path.join(adrDir, filename), adrContent, 'utf-8');
    } catch {
      // ignore
    }

    await this.flush();
    return decision;
  }

  public getFailedAttemptsForFile(filePath: string): FailedAttempt[] {
    const norm = filePath.replace(/\\/g, '/').toLowerCase();
    return this.state.failedAttempts.filter((fa) =>
      fa.affectedFiles.some((f) => f.toLowerCase().includes(norm) || norm.includes(f.toLowerCase()))
    );
  }

  public getAllFailedAttempts(): FailedAttempt[] {
    return this.state.failedAttempts;
  }

  public getAllDecisions(): Decision[] {
    return this.state.manualDecisions;
  }

  public async flush(): Promise<void> {
    if (!this.isDirty) return;
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      await fs.writeFile(this.memoryFile, JSON.stringify(this.state, null, 2), 'utf-8');
      this.isDirty = false;
    } catch (err) {
      console.error('[SessionMemory] Failed to write memory:', err);
    }
  }
}
