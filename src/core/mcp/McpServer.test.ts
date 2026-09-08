import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectBrain } from '../brain/ProjectBrain.js';
import { McpServer } from './McpServer.js';

describe('McpServer', () => {
  let tempDir: string;
  let brain: ProjectBrain;
  let mcpServer: McpServer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivora-mcp-test-'));
    await fs.writeFile(
      path.join(tempDir, 'sample.ts'),
      `export const hello = 'world';`,
      'utf-8'
    );
    brain = new ProjectBrain(tempDir);
    await brain.init();
    mcpServer = new McpServer(brain);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('exposes standard tool definitions', () => {
    const tools = mcpServer.getTools();
    expect(tools.map((t) => t.name)).toContain('nivora_what_should_i_know');
    expect(tools.map((t) => t.name)).toContain('nivora_project_health');
  });

  it('executes nivora_what_should_i_know tool successfully', async () => {
    const response = await mcpServer.callTool('nivora_what_should_i_know', {
      filePath: 'sample.ts',
    });

    expect(response.isError).toBeFalsy();
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain('# NIVORA PROJECT CONTEXT');
    expect(response.content[0].text).toContain('sample.ts');
  });
});
