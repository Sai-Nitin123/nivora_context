import * as fs from 'fs/promises';
import * as path from 'path';
import { Decision } from '../../types/index.js';

export interface ParsedDoc {
  path: string;
  title: string;
  lastModified: string;
  sections: Array<{ heading: string; content: string }>;
}

export class DocParser {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  public async parseAll(fileList: string[]): Promise<{ decisions: Decision[]; docs: ParsedDoc[] }> {
    const mdFiles = fileList.filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));
    const decisions: Decision[] = [];
    const docs: ParsedDoc[] = [];

    for (const file of mdFiles) {
      const fullPath = path.isAbsolute(file) ? file : path.join(this.workspaceRoot, file);
      const relPath = path.relative(this.workspaceRoot, fullPath).replace(/\\/g, '/');

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const stat = await fs.stat(fullPath);
        const lastModified = stat.mtime.toISOString();

        // Check if file is an ADR or Decision record
        if (this.isDecisionFile(relPath, content)) {
          const decision = this.parseDecision(relPath, content, lastModified);
          if (decision) {
            decisions.push(decision);
          }
        }

        // Parse as structured document
        const parsedDoc = this.parseMarkdownStructure(relPath, content, lastModified);
        docs.push(parsedDoc);
      } catch {
        // Skip unreadable files
      }
    }

    return { decisions, docs };
  }

  private isDecisionFile(relPath: string, content: string): boolean {
    const lowerPath = relPath.toLowerCase();
    if (
      lowerPath.includes('adr') ||
      lowerPath.includes('decision') ||
      lowerPath.startsWith('.nivora/decisions') ||
      lowerPath.startsWith('docs/adr')
    ) {
      return true;
    }

    // Check content headers
    const lowerContent = content.toLowerCase();
    return (
      (lowerContent.includes('# adr-') || lowerContent.includes('# decision')) &&
      (lowerContent.includes('## status') || lowerContent.includes('## context'))
    );
  }

  public parseDecision(relPath: string, content: string, lastModified: string): Decision | null {
    // 1. Try YAML frontmatter
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      const idMatch = fm.match(/id:\s*([^\r\n]+)/);
      const titleMatch = fm.match(/title:\s*([^\r\n]+)/);
      const statusMatch = fm.match(/status:\s*([^\r\n]+)/);
      const dateMatch = fm.match(/date:\s*([^\r\n]+)/);
      const reasonMatch = fm.match(/reason:\s*([^\r\n]+)/);

      const affected: string[] = [];
      const affectedBlock = fm.match(/affected:\s*\r?\n((?:\s*-\s*[^\r\n]+\r?\n?)+)/);
      if (affectedBlock) {
        const lines = affectedBlock[1].split('\n');
        for (const line of lines) {
          const m = line.match(/-\s*([^\r\n]+)/);
          if (m) affected.push(m[1].trim());
        }
      }

      if (titleMatch) {
        return {
          id: idMatch ? idMatch[1].trim() : path.basename(relPath, path.extname(relPath)).toUpperCase(),
          title: titleMatch[1].trim().replace(/^['"]|['"]$/g, ''),
          reason: reasonMatch ? reasonMatch[1].trim() : this.extractReasonFromText(content),
          date: dateMatch ? dateMatch[1].trim() : lastModified.split('T')[0],
          affectedComponents: affected,
          status: (statusMatch ? statusMatch[1].trim().toLowerCase() : 'active') as any,
          source: relPath,
          lastVerified: lastModified,
        };
      }
    }

    // 2. Try Standard ADR Markdown headers
    const titleMatch = content.match(/^#\s+(?:ADR[-:]?\s*(\d+)[:\s-]*)?([^\r\n]+)/m);
    if (!titleMatch) return null;

    const adrNum = titleMatch[1] ? `ADR-${titleMatch[1].padStart(3, '0')}` : path.basename(relPath, path.extname(relPath)).toUpperCase();
    const title = titleMatch[2].trim();

    const statusMatch = content.match(/##\s*Status\s*\r?\n+([^\r\n#]+)/i);
    const dateMatch = content.match(/Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const reason = this.extractReasonFromText(content);

    // Extract mentioned code or components
    const affected = this.extractAffectedComponents(content);

    return {
      id: adrNum,
      title,
      reason,
      date: dateMatch ? dateMatch[1] : lastModified.split('T')[0],
      affectedComponents: affected,
      status: statusMatch && statusMatch[1].toLowerCase().includes('superseded') ? 'superseded' : 'active',
      source: relPath,
      lastVerified: lastModified,
    };
  }

  private extractReasonFromText(content: string): string {
    const contextMatch = content.match(/##\s*(?:Context|Reason|Problem)\s*\r?\n+([\s\S]*?)(?=\r?\n##|$)/i);
    if (contextMatch) {
      return contextMatch[1].trim().replace(/\r?\n/g, ' ').slice(0, 300);
    }
    return 'Documented architectural design decision.';
  }

  private extractAffectedComponents(content: string): string[] {
    const affected: Set<string> = new Set();
    // Matches backtick-enclosed identifiers or files like `PaymentService` or `src/payments`
    const codeMatch = content.match(/`([A-Za-z0-9_./\-]+)`/g);
    if (codeMatch) {
      for (const m of codeMatch) {
        const cleaned = m.replace(/`/g, '');
        if (cleaned.length > 3 && !cleaned.startsWith('http')) {
          affected.add(cleaned);
        }
      }
    }
    return Array.from(affected);
  }

  private parseMarkdownStructure(relPath: string, content: string, lastModified: string): ParsedDoc {
    const lines = content.split('\n');
    let title = path.basename(relPath, path.extname(relPath));
    const sections: Array<{ heading: string; content: string }> = [];

    let currentHeading = 'Overview';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace('# ', '').trim();
      } else if (line.startsWith('## ') || line.startsWith('### ')) {
        if (currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n').trim(),
          });
          currentContent = [];
        }
        currentHeading = line.replace(/^#+\s*/, '').trim();
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n').trim(),
      });
    }

    return {
      path: relPath,
      title,
      lastModified,
      sections,
    };
  }
}
