import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { CommitInfo, FileChurn } from '../../types/index.js';

const execFileAsync = promisify(execFile);

export class GitAnalyzer {
  private workspaceRoot: string;
  private isGitAvailable: boolean | null = null;
  private commitCache: Map<string, CommitInfo[]> = new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  private async runGit(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: this.workspaceRoot,
        timeout: 5000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch {
      return '';
    }
  }

  public async isRepo(): Promise<boolean> {
    if (this.isGitAvailable !== null) {
      return this.isGitAvailable;
    }
    const res = await this.runGit(['rev-parse', '--is-inside-work-tree']);
    this.isGitAvailable = res === 'true';
    return this.isGitAvailable;
  }

  public async getCurrentBranch(): Promise<string> {
    const branch = await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    return branch || 'unknown';
  }

  public async getRecentCommits(limit = 20): Promise<CommitInfo[]> {
    const format = '%H|%h|%an|%ad|%ar|%s';
    const raw = await this.runGit([
      'log',
      `-n`,
      `${limit}`,
      `--date=iso-strict`,
      `--pretty=format:${format}`,
    ]);

    if (!raw) return [];
    return this.parseCommitLines(raw);
  }

  public async getFileHistory(filePath: string, limit = 10): Promise<CommitInfo[]> {
    const relPath = path.isAbsolute(filePath) ? path.relative(this.workspaceRoot, filePath) : filePath;
    const normalized = relPath.replace(/\\/g, '/');

    if (this.commitCache.has(normalized)) {
      return this.commitCache.get(normalized)!;
    }

    const format = '%H|%h|%an|%ad|%ar|%s';
    const raw = await this.runGit([
      'log',
      `-n`,
      `${limit}`,
      `--date=iso-strict`,
      `--pretty=format:${format}`,
      '--',
      normalized,
    ]);

    if (!raw) {
      this.commitCache.set(normalized, []);
      return [];
    }

    const commits = this.parseCommitLines(raw, [normalized]);
    this.commitCache.set(normalized, commits);
    return commits;
  }

  public async getFileChurn(filePath: string): Promise<FileChurn> {
    const relPath = path.isAbsolute(filePath) ? path.relative(this.workspaceRoot, filePath) : filePath;
    const normalized = relPath.replace(/\\/g, '/');
    const commits = await this.getFileHistory(normalized, 50);

    return {
      path: normalized,
      commitCount: commits.length,
      lastModified: commits.length > 0 ? commits[0].date : new Date().toISOString(),
      recentCommits: commits.slice(0, 5),
    };
  }

  public async getCommitsSince(filePath: string, sinceDate: string): Promise<CommitInfo[]> {
    const relPath = path.isAbsolute(filePath) ? path.relative(this.workspaceRoot, filePath) : filePath;
    const normalized = relPath.replace(/\\/g, '/');

    const format = '%H|%h|%an|%ad|%ar|%s';
    const raw = await this.runGit([
      'log',
      `--since=${sinceDate}`,
      `--date=iso-strict`,
      `--pretty=format:${format}`,
      '--',
      normalized,
    ]);

    if (!raw) return [];
    return this.parseCommitLines(raw, [normalized]);
  }

  public async getChangedFiles(): Promise<{ modified: string[]; untracked: string[]; staged: string[] }> {
    const rawStatus = await this.runGit(['status', '--porcelain']);
    const modified: string[] = [];
    const untracked: string[] = [];
    const staged: string[] = [];

    if (!rawStatus) return { modified, untracked, staged };

    const lines = rawStatus.split('\n');
    for (const line of lines) {
      if (!line) continue;
      const indexStatus = line.charAt(0);
      const workTreeStatus = line.charAt(1);
      const filePath = line.slice(3).trim();

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(filePath);
      } else {
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged.push(filePath);
        }
        if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
          modified.push(filePath);
        }
      }
    }

    return { modified, untracked, staged };
  }

  private parseCommitLines(raw: string, files: string[] = []): CommitInfo[] {
    const lines = raw.split('\n').filter(Boolean);
    return lines.map((line) => {
      const parts = line.split('|');
      return {
        hash: parts[0] || '',
        shortHash: parts[1] || '',
        author: parts[2] || '',
        date: parts[3] || '',
        relativeTime: parts[4] || '',
        message: parts.slice(5).join('|') || '',
        files,
      };
    });
  }

  public clearCache(): void {
    this.commitCache.clear();
  }
}
