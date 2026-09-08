# Nivora Context

## Portable AI Context Layer for Software Developers

**Product:** Nivora Context
**Company:** Nivora Labs
**Version:** MVP v0.1
**Document Type:** Product + Engineering Specification
**Primary Platform:** VS Code Extension
**Secondary Platform:** Web Application
**Architecture Goal:** Local-first, provider-agnostic, privacy-conscious

---

# 1. Product Vision

Nivora Context solves one specific problem:

> Developers lose valuable context when moving a task from one AI conversation, coding agent, IDE, or model to another.

A developer may spend 30 minutes explaining:

* what they are building
* what has already been implemented
* architectural decisions
* relevant files
* failed approaches
* errors
* constraints
* remaining work

When they move from Claude to Gemini, ChatGPT, Copilot, Codex, Antigravity, or another agent, that context is usually lost.

Nivora Context converts the current development state into a portable, structured **Context Package**.

The package can then be transferred to another AI system.

---

# 2. Core Product Promise

### From:

> "Let me explain everything again."

### To:

> "Continue from here."

The ideal workflow is:

```text
AI Agent A
     ↓
Developer clicks:
"Package Context"
     ↓
Nivora analyzes current task
     ↓
Creates Context Package
     ↓
Developer chooses destination
     ↓
Agent B receives context
     ↓
Agent B continues execution
```

---

# 3. Product Philosophy

Nivora Context must NOT initially attempt to replace coding agents.

It is a **context interoperability layer**.

The first version should work with existing AI systems.

Nivora's value is:

1. extracting context
2. structuring context
3. preserving context
4. minimizing context size
5. transferring context
6. allowing another agent to continue work

---

# 4. Target Users

Primary:

* software developers
* students working on large projects
* AI-assisted developers
* developers using multiple coding agents
* developers switching between AI providers
* developers working across VS Code and agentic IDEs

Secondary:

* engineering teams
* technical leads
* AI engineering teams
* open-source maintainers

---

# 5. MVP Scope

The MVP should focus on exactly five capabilities.

## MVP Feature 1 — Capture

Capture the current development context.

Sources:

* selected code
* open files
* workspace files
* Git diff
* Git status
* terminal output
* developer notes
* manually pasted AI conversation
* generated summaries

---

## MVP Feature 2 — Understand

Nivora transforms raw information into structured context.

It identifies:

* task objective
* current state
* files involved
* dependencies
* decisions
* constraints
* failed attempts
* errors
* completed work
* remaining work

---

## MVP Feature 3 — Package

Create a portable Context Package.

Example:

```json
{
  "version": "0.1",
  "project": {
    "name": "ecommerce-api",
    "language": ["TypeScript"],
    "framework": "Node.js"
  },
  "task": {
    "objective": "Implement OAuth authentication",
    "status": "partially_complete"
  },
  "completed": [
    "OAuth callback endpoint created",
    "User model updated"
  ],
  "remaining": [
    "Implement token refresh",
    "Add integration tests"
  ],
  "decisions": [
    "Use JWT access tokens",
    "Use PostgreSQL for persistence"
  ],
  "constraints": [
    "Do not modify generated files",
    "Use existing authentication middleware"
  ],
  "files": [
    {
      "path": "src/auth/AuthService.ts",
      "reason": "Primary authentication logic"
    }
  ],
  "errors": [
    {
      "message": "Refresh token validation failed",
      "source": "integration-test"
    }
  ]
}
```

---

## MVP Feature 4 — Export

Users should be able to export the Context Package as:

### Markdown

For maximum compatibility.

### JSON

For machine-readable integrations.

### Plain text

For direct copy/paste.

### Nivora Context File

Use:

```text
.nivora/context/
```

and:

```text
.nivora/context/package.nctx
```

The `.nctx` format should contain structured metadata plus context.

---

## MVP Feature 5 — Continue

The destination agent receives:

1. project objective
2. relevant context
3. relevant files
4. previous work
5. failures
6. constraints
7. explicit continuation instructions

The generated handoff should end with:

```text
CONTINUE EXECUTION

Do not restart the task from scratch.

Review the supplied context and repository state.

Continue from the "Remaining Work" section.

Before modifying files:
1. Verify the current repository state.
2. Inspect the referenced files.
3. Confirm assumptions against the actual code.
4. Continue implementation.
5. Run relevant tests.
```

---

# 6. The Killer Feature

The primary CTA inside the extension should be:

## "Package & Continue"

The user should not have to understand the internal context format.

Example:

```text
Current AI:
Claude

Destination:
Gemini

Task:
Implement OAuth

[ Package & Continue ]
```

Nivora generates the package automatically.

---

# 7. User Experience

## VS Code Activity Bar

Add:

```text
NIVORA
```

with:

* Context
* Current Task
* Packages
* History
* Settings

---

# 8. Context Dashboard

Example:

```text
NIVORA CONTEXT

PROJECT
E-Commerce API

CURRENT TASK
Implement OAuth authentication

STATUS
72% complete

────────────────────────

CONTEXT

✓ Objective
✓ Architecture
✓ Relevant files
✓ Decisions
✓ Constraints
✓ Completed work
✓ Failed attempts
✓ Errors
✓ Remaining work

────────────────────────

PACKAGE SIZE

8,420 tokens

────────────────────────

DESTINATION

[ Markdown ]
[ JSON ]
[ Copy ]
[ Export ]

        [ PACKAGE & CONTINUE ]
```

---

# 9. Capture Methods

Nivora should support multiple capture mechanisms.

## Method A — Selection

Developer selects code.

Right click:

```text
Nivora
→ Add Selection to Context
```

---

## Method B — File

Right click:

```text
Nivora
→ Add File to Context
```

---

## Method C — Folder

Right click:

```text
Nivora
→ Analyze Folder
```

Nivora determines relevant files.

---

## Method D — Workspace

Command:

```text
Nivora: Analyze Workspace
```

Nivora creates a project-level context map.

---

## Method E — Conversation

Developer pastes a conversation.

Nivora extracts:

* objective
* decisions
* actions
* errors
* unresolved questions
* remaining work

---

# 10. AI Conversation Import

For MVP, do NOT attempt to scrape every AI website.

Instead support:

### Paste conversation

```text
Nivora
→ Import Conversation
→ Paste
→ Analyze
```

Later integrations can support provider-specific APIs/extensions.

This keeps the MVP legally and technically simpler.

---

# 11. Context Compression

One of Nivora's major technical features should be **context optimization**.

Do NOT send entire repositories.

Instead:

```text
Task
 ↓
Dependency analysis
 ↓
Relevant symbols
 ↓
Relevant files
 ↓
Recent changes
 ↓
Tests
 ↓
Errors
 ↓
Minimal context
```

The goal is:

> Maximum useful information with minimum tokens.

---

# 12. Context Layers

Every Context Package should have layers.

## Layer 1 — Critical

Always included.

* objective
* current state
* remaining work
* constraints
* critical errors

## Layer 2 — Relevant

Included when useful.

* architecture
* decisions
* relevant files
* dependencies
* tests

## Layer 3 — Supporting

Included when needed.

* historical attempts
* logs
* documentation
* related code

## Layer 4 — Optional

Available but omitted by default.

* unrelated files
* old conversations
* verbose logs

---

# 13. Context Scoring

Every candidate context item should receive a relevance score.

Conceptually:

```text
relevance =
task_similarity
+ dependency_relationship
+ recent_change
+ explicit_reference
+ error_relationship
```

This is not required to be perfect in MVP.

The system should simply prioritize context intelligently.

---

# 14. Project Context Memory

Nivora should maintain:

```text
.nivora/
    project.json
    rules.md
    architecture.md
    decisions.md
    context/
    history/
```

Example:

```text
.nivora/project.json
```

contains:

```json
{
  "name": "ecommerce-api",
  "language": ["typescript"],
  "framework": "node",
  "packageManager": "npm"
}
```

---

# 15. Engineering Decision Memory

Allow developers to explicitly save decisions.

Example:

```text
NIVORA DECISION

Decision:
Use PostgreSQL instead of MongoDB.

Reason:
The application requires relational transactions.

Date:
2026-09-08

Related:
database/schema.sql
src/repositories/
```

These decisions become reusable context.

---

# 16. Context Package Format

Create a stable specification.

```json
{
  "schema": "nctx-0.1",
  "createdAt": "ISO-8601",
  "project": {},
  "task": {},
  "objective": "",
  "state": "",
  "decisions": [],
  "constraints": [],
  "completedWork": [],
  "remainingWork": [],
  "files": [],
  "changes": [],
  "errors": [],
  "tests": [],
  "attempts": [],
  "instructions": ""
}
```

Future versions must maintain backwards compatibility where possible.

---

# 17. Markdown Export Format

The Markdown version should be human-readable.

```markdown
# Nivora Context Package

## Objective

Implement OAuth authentication.

## Current State

OAuth callback endpoint is implemented.

## Completed Work

- OAuth callback endpoint
- User model changes

## Remaining Work

- Implement refresh tokens
- Add integration tests

## Architecture

- Node.js
- PostgreSQL
- JWT authentication

## Decisions

- Use JWT access tokens
- Use PostgreSQL

## Constraints

- Do not modify generated files.
- Use existing authentication middleware.

## Relevant Files

### src/auth/AuthService.ts

Primary authentication logic.

### src/auth/OAuthController.ts

OAuth callback implementation.

## Known Errors

Refresh token validation currently fails integration tests.

## Previous Attempts

Attempt 1:
Used session-based authentication.

Result:
Rejected because API must remain stateless.

## CONTINUE EXECUTION

Do not restart the task.

Inspect the repository and continue from Remaining Work.
```

---

# 18. Architecture

The MVP should use a local-first architecture.

```text
                 VS CODE
                    │
             Nivora Extension
                    │
          ┌─────────┴─────────┐
          │                   │
       Workspace          Git / Terminal
          │                   │
          └─────────┬─────────┘
                    ▼
             Context Engine
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Analyzer     Git Engine   Parser
        │           │           │
        └───────────┼───────────┘
                    ▼
              Context Builder
                    │
                    ▼
             Context Optimizer
                    │
                    ▼
              Package Generator
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Markdown    JSON     NCTX
```

---

# 19. SaaS Architecture

Do not make the cloud mandatory for basic functionality.

MVP:

```text
VS Code
   ↓
Local processing
   ↓
Local context package
```

Optional cloud:

```text
VS Code
   ↓
Nivora Cloud
   ↓
Account
Projects
Package history
Sync
Analytics
```

---

# 20. Privacy Principle

Source code should remain local by default.

The user must explicitly choose whether code/context is sent to a remote AI provider.

Settings:

```text
Privacy

○ Local only

○ Use connected AI provider

○ Allow Nivora Cloud processing
```

Default:

### Local only

---

# 21. AI Provider Architecture

Nivora should support pluggable providers.

```text
AIProvider
│
├── OpenAIProvider
├── AnthropicProvider
├── GeminiProvider
├── OpenRouterProvider
└── LocalProvider
```

However, MVP can start with one provider.

The AI provider is used primarily for:

* summarization
* context extraction
* relevance ranking
* context compression

The product should remain functional without AI for basic capture/export.

---

# 22. BYOK

Users can connect their own provider keys.

Example:

```text
Settings
→ AI Providers

OpenAI
[ Connect ]

Anthropic
[ Connect ]

Google Gemini
[ Connect ]

OpenRouter
[ Connect ]
```

Keys must never be exposed in frontend UI or logs.

Use secure OS credential storage where possible.

---

# 23. Context Destination Architecture

Do NOT initially build provider-specific automation for every AI service.

Instead create a common destination interface.

```text
ContextDestination
│
├── Clipboard
├── Markdown
├── File
├── Webhook
├── API
└── ProviderAdapter
```

Later:

```text
ClaudeAdapter
GeminiAdapter
OpenAIAdapter
CodexAdapter
```

---

# 24. Immediate Execution

There are two levels.

## MVP

Nivora produces a ready-to-paste handoff prompt.

User:

```text
[Copy & Continue]
```

Then pastes it into another agent.

## V2

Nivora directly sends the package to an agent integration.

Example:

```text
Nivora
   ↓
Gemini Agent API
   ↓
Task
   ↓
Execution
```

Only implement direct execution when a supported API/CLI genuinely allows it.

Never pretend that a web chat supports programmatic execution if it does not.

---

# 25. Agent Handoff Contract

Every handoff must contain:

```text
SOURCE
TASK
OBJECTIVE
CURRENT STATE
COMPLETED WORK
REMAINING WORK
ARCHITECTURE
DECISIONS
CONSTRAINTS
RELEVANT FILES
CHANGES
ERRORS
TEST RESULTS
FAILED ATTEMPTS
NEXT ACTION
EXECUTION INSTRUCTIONS
```

The destination agent should receive a clear instruction:

> Continue from the current repository state. Do not recreate completed work.

---

# 26. Git Integration

Nivora should inspect:

```text
git status
git diff
git log
```

It should identify:

* modified files
* untracked files
* recent commits
* changed lines
* branch name

Example:

```text
CURRENT BRANCH

feature/oauth

MODIFIED

AuthService.ts
OAuthController.ts

UNTRACKED

OAuthConfig.ts
```

This information becomes part of the context.

---

# 27. Terminal Integration

Nivora should capture terminal output when explicitly requested.

Example:

```text
npm test

14 passed
2 failed
```

The package includes:

```text
TEST STATUS

14 passed
2 failed

Failures:
OAuthRefreshToken.test.ts
OAuthCallback.test.ts
```

Do not continuously record terminal activity in MVP.

Require explicit capture to protect privacy and performance.

---

# 28. Context History

Every package can be saved locally.

```text
Nivora
→ History

09 Sep
OAuth implementation

08 Sep
Payment API

07 Sep
Database migration
```

Selecting a package allows:

* view
* copy
* export
* delete
* restore

---

# 29. Package Diff

When generating a new package, compare it with the previous package.

Example:

```text
CONTEXT CHANGES

Added:
+ OAuth refresh token requirement

Changed:
~ Authentication architecture

Removed:
- Session-based approach

New errors:
+ RefreshTokenExpired
```

This prevents unnecessary context duplication.

---

# 30. Extension Commands

Commands:

```text
Nivora: Open Context
Nivora: Analyze Workspace
Nivora: Capture Selection
Nivora: Capture File
Nivora: Import Conversation
Nivora: Generate Context Package
Nivora: Copy Context
Nivora: Export Context
Nivora: View History
Nivora: Save Decision
Nivora: Package & Continue
```

---

# 31. Context Menu

Right-click:

```text
Nivora
├── Add to Context
├── Analyze Dependencies
├── Explain Relevance
└── Package Context
```

---

# 32. Keyboard Shortcut

Recommended:

```text
Ctrl + Shift + N
```

for opening Nivora.

Avoid conflicting with common VS Code shortcuts.

Make shortcuts configurable.

---

# 33. MVP Tech Stack

## Extension

TypeScript

VS Code Extension API

---

## Frontend

React

Use a webview only where necessary.

Keep the extension UI lightweight.

---

## Backend

Optional initially.

If required:

Node.js + TypeScript

---

## Database

MVP local:

SQLite or local JSON/index.

Cloud:

PostgreSQL.

---

## Search

MVP:

keyword + symbol + dependency relevance.

Later:

vector search / embeddings.

---

## Parsing

Use language-aware parsers where possible.

Start with:

* TypeScript
* JavaScript
* Python
* Java

Add more languages later.

---

# 34. Repository Index

Nivora should maintain a lightweight index.

Example:

```text
File
 ↓
Symbols
 ↓
Imports
 ↓
Exports
 ↓
References
 ↓
Git history
```

This enables relevance selection.

Do not embed the entire repository immediately.

---

# 35. Security Requirements

Never:

* upload source code without user consent
* expose API keys
* store secrets in logs
* include `.env` contents by default
* include private keys
* include credential files

Default exclusions:

```text
.env
.env.*
*.pem
*.key
credentials.*
secrets.*
node_modules/
.git/
```

Allow user configuration.

---

# 36. Performance Requirements

For a normal project:

Workspace analysis should feel interactive.

Target:

* extension activation: < 1 second where practical
* cached context generation: < 2 seconds
* incremental updates rather than full rescans
* no blocking of VS Code UI
* background indexing

Large repositories should use:

```text
incremental indexing
```

rather than rescanning everything.

---

# 37. Failure Handling

If AI summarization fails:

Nivora must still generate a basic package.

Example:

```text
AI unavailable.

Generated deterministic context from:

✓ Git
✓ Files
✓ Symbols
✓ Imports
✓ Tests
```

This makes the product resilient.

---

# 38. MVP Analytics

Only collect analytics with explicit consent.

Useful metrics:

* package creation count
* package size
* context generation time
* destination type
* successful continuation feedback
* feature usage

Do not collect source code by default.

---

# 39. Success Metric

The most important metric is NOT:

> Number of context packages created.

It is:

### Successful handoffs.

Measure:

```text
Context package created
        ↓
Transferred
        ↓
Developer continued task
        ↓
Task completed
```

Ask:

> "Did this handoff successfully let you continue the task?"

Options:

```text
👍 Yes
👎 No
```

---

# 40. North Star Metric

### Context Continuation Rate

```text
successful task continuations
──────────────────────────────
total handoffs
```

This should become the primary product metric.

---

# 41. MVP User Flow

A developer starts working with an AI.

The AI completes part of a task.

Developer wants to switch agents.

They press:

```text
Ctrl + Shift + N
```

Nivora opens.

They select:

```text
Package & Continue
```

Nivora:

```text
Analyzing task...
Analyzing repository...
Analyzing Git changes...
Selecting relevant files...
Compressing context...
Generating handoff...
```

Then:

```text
CONTEXT READY

8,420 tokens

Destination:
[ Copy for any AI ]

[ Copy & Continue ]
```

Developer opens the next AI.

Pastes.

The new agent receives:

```text
PROJECT CONTEXT
CURRENT TASK
COMPLETED WORK
FAILED ATTEMPTS
RELEVANT FILES
CONSTRAINTS
REMAINING WORK
EXECUTION INSTRUCTIONS
```

The agent continues.

---

# 42. V0.1 Development Plan

## Week 1

Build:

* VS Code extension
* sidebar
* workspace detection
* file selection
* Git status
* Git diff
* context object

---

## Week 2

Build:

* repository analyzer
* symbol extraction
* dependency extraction
* context ranking
* Markdown generator
* JSON generator
* clipboard export

---

## Week 3

Build:

* conversation importer
* AI summarization
* context compression
* package history
* `.nctx` format

---

## Week 4

Build:

* Package & Continue
* polish
* error handling
* privacy settings
* onboarding
* telemetry
* testing

---

# 43. MVD

The minimum viable demo should be even smaller.

The MVD needs only:

```text
VS Code Extension

        ↓

Select files

        ↓

Import/paste AI conversation

        ↓

Nivora combines them

        ↓

AI summarizes

        ↓

Generate Context Package

        ↓

Copy

        ↓

Paste into another AI
```

That's it.

If this works beautifully, you have demonstrated the core value proposition.

---

# 44. What NOT to build in MVD

Do NOT initially build:

* multi-agent orchestration
* model hosting
* your own coding model
* SaaS billing
* team management
* vector database
* cloud execution
* 20 provider integrations
* automatic browser scraping
* complex agent automation
* autonomous coding
* elaborate dashboards

Those are later.

---

# 45. V2

Once handoffs work:

Add:

* direct provider integrations
* automatic context updates
* persistent project memory
* project decisions
* GitHub integration
* agent history
* context diff
* context quality scoring
* automatic context refresh

---

# 46. V3

Eventually:

```text
Nivora Context
       ↓
Nivora Memory
       ↓
Nivora Handoff
       ↓
Nivora Agent
       ↓
Nivora Orchestrator
```

This can eventually become the larger Nivora AI engineering platform.

---

# 47. Product Positioning

Do NOT position Nivora as:

> Another AI coding assistant.

Do NOT position it initially as:

> Another AI orchestrator.

Position it as:

> **Nivora Context — move your development context between AI agents without starting over.**

Alternative:

> **Your codebase remembers. Your AI should too.**

Primary product promise:

> **Switch AI agents. Keep the context. Continue working.**

---

# 48. Landing Page

Hero:

# Switch AI. Not context.

Your development context shouldn't disappear when you switch from one AI agent to another.

Nivora Context captures your task, code, decisions, changes, errors and remaining work into a portable package that any AI can understand.

CTA:

**Get Nivora Context**

Secondary:

**See how it works**

---

# 49. Long-Term Vision

Nivora Context should eventually become a standard context interoperability layer.

```text
              Nivora Context
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
    Claude         Gemini         GPT
       │             │             │
       ▼             ▼             ▼
   Codex          Antigravity   Other Agents
```

The long-term goal is:

> **Any AI developer tool can consume a Nivora Context Package.**

Nivora should become the portable context layer between developers, codebases and AI agents.

---

# 50. Final Product Principle

The product must always answer one question:

> **"Can I move my work from one AI to another without starting over?"**

If yes, Nivora is doing its job.

If a feature does not improve context capture, context quality, portability, or continuation, it should probably not be in the MVP.
