import * as fs from 'fs/promises';
import * as path from 'path';
import { ContextCard, ProjectBrainState } from '../../types/index.js';

export interface SerializedCache {
  version: string;
  updatedAt: string;
  brainState: ProjectBrainState | null;
  cards: Record<string, ContextCard>;
}

export class CacheManager {
  private workspaceRoot: string;
  private cacheDir: string;
  private cacheFile: string;
  private inMemoryCache: SerializedCache;
  private isDirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = path.join(workspaceRoot, '.nivora');
    this.cacheFile = path.join(this.cacheDir, 'cache.json');
    this.inMemoryCache = {
      version: '0.1.0',
      updatedAt: new Date().toISOString(),
      brainState: null,
      cards: {},
    };
  }

  /**
   * Initializes cache by loading from .nivora/cache.json if present
   */
  public async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(data) as SerializedCache;
      if (parsed.version === this.inMemoryCache.version) {
        this.inMemoryCache = parsed;
      }
    } catch {
      // No existing cache or invalid format, start fresh
      this.inMemoryCache = {
        version: '0.1.0',
        updatedAt: new Date().toISOString(),
        brainState: null,
        cards: {},
      };
    }
  }

  public getBrainState(): ProjectBrainState | null {
    return this.inMemoryCache.brainState;
  }

  public async setBrainState(state: ProjectBrainState): Promise<void> {
    this.inMemoryCache.brainState = state;
    this.inMemoryCache.updatedAt = new Date().toISOString();
    this.markDirty();
  }

  public getContextCard(targetPath: string): ContextCard | null {
    const normalized = path.normalize(targetPath);
    return this.inMemoryCache.cards[normalized] || null;
  }

  public async setContextCard(targetPath: string, card: ContextCard): Promise<void> {
    const normalized = path.normalize(targetPath);
    this.inMemoryCache.cards[normalized] = card;
    this.inMemoryCache.updatedAt = new Date().toISOString();
    this.markDirty();
  }

  public clear(): void {
    this.inMemoryCache.brainState = null;
    this.inMemoryCache.cards = {};
    this.markDirty();
  }

  /**
   * Debounced asynchronous write to avoid locking I/O during active coding
   */
  private markDirty(): void {
    this.isDirty = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flush().catch((err) => {
        console.error('[Nivora Cache] Failed to persist cache:', err);
      });
    }, 500);
  }

  /**
   * Persists in-memory cache directly to disk
   */
  public async flush(): Promise<void> {
    if (!this.isDirty) return;
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.writeFile(this.cacheFile, JSON.stringify(this.inMemoryCache, null, 2), 'utf-8');
      this.isDirty = false;
    } catch (err) {
      console.error('[Nivora Cache] Flush error:', err);
    }
  }
}
