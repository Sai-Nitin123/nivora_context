import { ProjectBrain } from '../brain/ProjectBrain.js';
import { AgentExporter } from '../export/AgentExporter.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export class McpServer {
  private brain: ProjectBrain;

  constructor(brain: ProjectBrain) {
    this.brain = brain;
  }

  public getTools(): McpToolDefinition[] {
    return [
      {
        name: 'nivora_what_should_i_know',
        description:
          'Provides verified project context, architecture decisions (ADRs), recent changes, risks, and confidence scores before modifying any file.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'The path of the file or component to inspect (e.g. src/auth/AuthService.ts)',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'nivora_project_health',
        description: 'Returns project architecture, health score, and stale documentation warnings.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  public async callTool(name: string, args: Record<string, any>): Promise<McpResponse> {
    try {
      if (name === 'nivora_what_should_i_know') {
        const filePath = args.filePath;
        if (!filePath) {
          return {
            content: [{ type: 'text', text: 'Error: filePath argument is required.' }],
            isError: true,
          };
        }

        const card = await this.brain.whatShouldIKnow(filePath);
        const markdown = AgentExporter.toMarkdownHandoff(card);

        return {
          content: [{ type: 'text', text: markdown }],
        };
      }

      if (name === 'nivora_project_health') {
        let state = this.brain.getState();
        if (!state) {
          state = await this.brain.sync();
        }

        const summary = [
          `# Project Brain: ${state.projectName}`,
          `**Architecture:** ${state.architecture}`,
          `**Context Health:** ${state.overallHealth}%`,
          `**Indexed Files:** ${state.filesCount}`,
          `**Decisions (ADRs):** ${state.decisions.length}`,
          `**Stale Warnings:** ${state.staleKnowledge.length}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: summary }],
        };
      }

      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${err.message}` }],
        isError: true,
      };
    }
  }
}
