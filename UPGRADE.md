# Nivora Context

## The Project Brain for AI-Native Software Development

**Company:** Nivora Labs
**Product:** Nivora Context
**Working Codename:** Nivora Lens
**Category:** Developer Infrastructure / AI Engineering Intelligence
**Primary Platform:** VS Code Extension
**Architecture:** Local-first, provider-agnostic
**Status:** MVP / MVD Specification

---

# 1. Executive Summary

AI coding agents are becoming extremely capable.

Claude Code, Codex, Gemini, Cursor, Antigravity, GitHub Copilot and other systems can already:

* read repositories
* understand files
* search code
* modify code
* run commands
* inspect Git
* maintain conversation history
* use project instructions
* work autonomously

The problem is no longer simply:

> **"AI doesn't have enough context."**

The deeper problem is:

> **Project knowledge is fragmented, constantly changing, and difficult to trust.**

A software project contains knowledge scattered across:

* source code
* Git history
* commits
* branches
* pull requests
* documentation
* architecture decisions
* issues
* TODOs
* configuration
* dependencies
* environment assumptions
* previous AI sessions
* developer decisions
* bugs
* conventions
* recent changes

Individual AI agents can access portions of this information.

But there is rarely a **persistent, project-level source of truth** that continuously answers:

> What does the project currently know?

> What changed?

> What decisions matter?

> What information is stale?

> What should an AI or developer know before touching this part of the system?

That is the problem Nivora Context solves.

---

# 2. Product Vision

## Vision

> **Build the intelligence layer that sits between software projects and AI agents.**

Nivora Context should become a persistent **Project Brain** that understands the evolving state of a software project and provides relevant, evidence-backed context to humans and AI systems.

Instead of every AI agent independently rediscovering the project:

```text
Claude
Codex
Gemini
Cursor
Copilot
Antigravity
        ↓
        ↓
  Nivora Context
        ↓
 Project Knowledge
        ↓
Code + Git + Docs + Decisions + History
```

Nivora becomes the reusable intelligence layer.

---

# 3. The Core Insight

The competitive mistake would be building:

> "Another AI coding assistant."

Or:

> "A tool that copies context from Claude to Gemini."

Those problems are increasingly being solved by existing IDEs and agent ecosystems.

Nivora should solve something harder:

# Context Quality

Knowing **which context matters, whether it is still valid, where it came from, and how confidently it can be trusted.**

Example:

A developer asks:

> "Can I change the payment service?"

A normal AI agent may inspect the relevant files.

Nivora should be able to say:

```text
PAYMENT SYSTEM

Architecture:
Payment API → Payment Service → Stripe Adapter

Relevant files:
• src/payments/payment.service.ts
• src/payments/stripe.adapter.ts
• src/payments/payment.controller.ts

Important decision:
Stripe is isolated behind an adapter.
Decision recorded in ADR-014.

Recent changes:
7 payment-related files changed in the last 14 days.

Known issue:
Webhook retries can create duplicate processing.

⚠ Context warning:
The payment architecture documentation is 47 days old.

Confidence:
82%

Before changing this system:
1. Review ADR-014
2. Review commit #8fa31c
3. Inspect webhook retry handling
```

That is substantially more valuable than simply giving another chatbot access to the repository.

---

# 4. Product Positioning

## Nivora Context is NOT:

* another coding chatbot
* another AI IDE
* another Git client
* another vector database
* another RAG wrapper
* a prompt manager
* a simple context exporter
* a Claude → GPT handoff utility
* a generic project documentation generator

## Nivora Context IS:

> **A persistent, evidence-backed intelligence layer for software projects.**

It continuously builds a structured understanding of:

* architecture
* code relationships
* decisions
* changes
* dependencies
* issues
* conventions
* current work
* project history
* context freshness

---

# 5. The Three Pillars

Nivora Context should be built around three fundamental capabilities.

## 5.1 Understand

Nivora builds a structured representation of the project.

It understands:

```text
Project
 ├── Architecture
 ├── Components
 ├── Dependencies
 ├── Services
 ├── APIs
 ├── Database
 ├── Configuration
 ├── Decisions
 ├── Issues
 ├── Recent Changes
 └── Current Work
```

---

## 5.2 Remember

Nivora maintains persistent project knowledge.

Examples:

```text
Decision:
PostgreSQL is the primary database.

Decision:
Stripe integration must remain isolated.

Convention:
API errors use the AppError class.

Known issue:
Order processing can fail when inventory
reservation times out.

Current work:
Migration from REST endpoint /v1/orders
to /v2/orders.
```

---

## 5.3 Verify

This is the most important differentiator.

Nivora should not blindly claim:

> "The project uses X."

Instead:

```text
Project uses PostgreSQL.

Evidence:
• docker-compose.yml
• prisma/schema.prisma
• package.json
• commit 3fa91d

Last verified:
September 8, 2026

Confidence:
97%
```

Knowledge should have:

* source
* timestamp
* confidence
* freshness
* affected files
* relationship to recent changes

---

# 6. The "Context Confidence" System

This should become one of Nivora's signature concepts.

Instead of treating all project knowledge equally:

```text
Architecture Confidence       94%
Dependency Confidence         98%
Payment Context               82%
Authentication Context        91%
Current Task Context          87%
Documentation Freshness       63%
Overall Project Context       89%
```

Nivora should identify uncertainty.

Example:

```text
⚠ PAYMENT CONTEXT MAY BE STALE

Last architecture verification:
47 days ago

Since then:
• 13 commits
• 8 files changed
• 2 dependency updates
• 1 database migration

Recommendation:
Re-analyze payment architecture.
```

This turns Nivora from a simple RAG system into a **context reliability system**.

---

# 7. Core User Experience

The MVP should live inside VS Code.

The developer opens a repository.

Nivora automatically analyzes the project.

A panel appears:

```text
┌─────────────────────────────────────┐
│ NIVORA                              │
│ Project Brain                       │
├─────────────────────────────────────┤
│                                     │
│ PROJECT                             │
│ E-Commerce Platform                 │
│                                     │
│ CONTEXT HEALTH                      │
│ ████████████████░░ 89%              │
│                                     │
│ ARCHITECTURE                        │
│ React → Node → PostgreSQL           │
│                                     │
│ ACTIVE WORK                         │
│ Payment migration                   │
│                                     │
│ RECENT CHANGES                      │
│ 23 files changed                    │
│                                     │
│ DECISIONS                           │
│ 12 recorded                         │
│                                     │
│ KNOWN ISSUES                        │
│ 4                                   │
│                                     │
│ ⚠ STALE KNOWLEDGE                   │
│ Payment architecture                │
│ Last verified: 47 days ago          │
│                                     │
│ [ Ask Nivora ]                      │
└─────────────────────────────────────┘
```

---

# 8. The Killer Feature

## "What should I know before changing this?"

This should be one of the first experiences users remember.

Developer selects a file, function, folder, or service.

Example:

```text
src/payments/payment.service.ts
```

Nivora provides:

```text
BEFORE YOU MODIFY THIS

This service is responsible for:

• payment creation
• payment confirmation
• webhook reconciliation

Related components:

→ StripeAdapter
→ PaymentController
→ OrderService
→ PaymentRepository

Important decisions:

→ ADR-014: Payment providers must use adapters.

Recent changes:

→ Commit 8fa31c changed webhook retry behavior.

Known risks:

⚠ Duplicate webhook processing
⚠ Order/payment state synchronization

Related tests:

→ payment.service.spec.ts
→ webhook-handler.spec.ts

Context confidence: 91%
```

This is where Nivora starts feeling genuinely useful.

---

# 9. Evidence-Backed Answers

Nivora should avoid producing unsupported AI answers.

Every important claim should be traceable.

Example:

User:

> "Why does this service use Redis?"

Nivora:

```text
Redis is used here for distributed locking.

Evidence:

1. src/locks/redis-lock.ts
2. src/orders/order.service.ts
3. Commit #73fa91
4. ADR-009

Original decision:
Redis was selected to prevent duplicate order
processing across multiple application instances.

Confidence: 96%
```

The user can click the evidence.

This creates trust.

---

# 10. Project Knowledge Graph

Internally, Nivora should gradually build a graph.

Example:

```text
PaymentService
      │
      ├── uses → StripeAdapter
      │
      ├── called by → PaymentController
      │
      ├── affects → OrderService
      │
      ├── depends on → PostgreSQL
      │
      ├── protected by → Payment Tests
      │
      └── governed by → ADR-014
```

Another example:

```text
Commit
  ↓
File
  ↓
Function
  ↓
Service
  ↓
Architecture Component
  ↓
Decision
  ↓
Known Risk
```

This graph does not need to be a huge Neo4j-style infrastructure in the MVP.

A lightweight local graph is enough.

---

# 11. Context Sources

Nivora should eventually understand multiple sources.

## MVP

### Source Code

* files
* folders
* symbols
* imports
* exports
* APIs
* configuration

### Git

* commits
* branches
* diffs
* changed files
* authors
* timestamps

### Project Documentation

* README
* docs
* ADRs
* architecture documents
* markdown files

### Project Configuration

* package.json
* requirements.txt
* pom.xml
* .env.example
* Docker files
* CI configuration
* project-specific configuration

---

# 12. Future Sources

After validation:

* GitHub issues
* pull requests
* code reviews
* Jira
* Linear
* Slack
* Notion
* Confluence
* AI agent sessions
* CI/CD
* test results
* production incidents
* observability systems

The important principle:

> Nivora should eventually understand the entire engineering lifecycle, not only the codebase.

---

# 13. Stale Knowledge Detection

This is potentially one of the strongest features.

Nivora should detect when stored project knowledge no longer matches the project.

Example:

```text
⚠ STALE KNOWLEDGE

Knowledge:
"Authentication uses Passport.js."

Last verified:
62 days ago.

Since then:
• 19 commits
• 14 authentication-related files changed
• Passport dependency updated

Confidence:
41%

[Re-analyze]
```

Another example:

```text
⚠ ARCHITECTURE DRIFT

Documentation says:

Frontend → REST API → PostgreSQL

Current code suggests:

Frontend → REST API
           ↓
        Redis
           ↓
      PostgreSQL

The architecture document may be outdated.
```

This is far more interesting than static documentation generation.

---

# 14. Architecture Drift

Nivora should eventually compare:

```text
Declared Architecture
        VS
Actual Codebase
```

Example:

```text
ARCHITECTURE DRIFT DETECTED

Documented:
PaymentService → Stripe

Observed:
PaymentService
    → Stripe
    → PayPal
    → Razorpay

3 undocumented dependencies detected.
```

This becomes a valuable engineering intelligence feature.

---

# 15. Decision Memory

Nivora should maintain project decisions.

Example:

```text
DECISION #014

Title:
Payment providers use adapter pattern.

Reason:
Allow provider replacement without modifying
business logic.

Date:
May 14, 2026

Affected components:
• PaymentService
• StripeAdapter
• PayPalAdapter

Status:
Active

Last verified:
September 8, 2026
```

The system should distinguish:

```text
Decision
Fact
Inference
Suggestion
Unknown
```

This distinction is extremely important.

---

# 16. Facts vs Inferences

Nivora should never blur these.

Example:

### FACT

```text
The project contains PostgreSQL configuration.
Source:
docker-compose.yml
```

### INFERENCE

```text
PostgreSQL appears to be the primary database.

Confidence: 93%
```

### DECISION

```text
PostgreSQL was selected for transactional consistency.

Source:
ADR-002
```

### UNKNOWN

```text
It is unclear whether Redis is used in production.
```

This creates a much more trustworthy system.

---

# 17. Nivora Query Engine

Users should be able to ask project questions.

Examples:

```text
What should I know before modifying authentication?

Why does this service exist?

What depends on this function?

What changed recently in payments?

Which architecture decisions affect this file?

Is this documentation outdated?

What are the biggest risks in this module?

Where is Redis used?

What breaks if I remove this API?

Which files are related to checkout?

What assumptions does this code make?

What has changed since the last architecture review?
```

---

# 18. Impact Analysis

A powerful future capability:

```text
"What happens if I change PaymentService?"
```

Nivora responds:

```text
POTENTIAL IMPACT

Direct dependents:
• PaymentController
• CheckoutService

Indirect dependents:
• OrderService
• InvoiceService
• NotificationService

Tests potentially affected:
• 17

Architecture decisions affected:
• ADR-014

Known risks:
• webhook synchronization
• duplicate payment handling

Estimated change surface:
23 files
```

This moves Nivora toward **engineering intelligence**, rather than documentation.

---

# 19. AI Agent Integration

Nivora should not try to replace every AI agent.

Instead:

> **Give every AI agent access to the same project brain.**

Eventually Nivora exposes:

* MCP server
* API
* CLI
* VS Code extension
* local context service

Architecture:

```text
             ┌──────────────┐
             │    Claude    │
             └──────┬───────┘
                    │
             ┌──────▼───────┐
             │    Codex     │
             └──────┬───────┘
                    │
             ┌──────▼───────┐
             │    Gemini    │
             └──────┬───────┘
                    │
             ┌──────▼───────┐
             │  Nivora MCP  │
             └──────┬───────┘
                    │
          ┌─────────▼─────────┐
          │ Nivora Project    │
          │ Brain             │
          └─────────┬─────────┘
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
      Code         Git          Docs
```

Now Nivora is not competing with the agents.

It makes them better.

---

# 20. Example Agent Interaction

Claude asks Nivora:

```text
Before modifying PaymentService,
give me the relevant project context.
```

Nivora returns:

```text
PROJECT CONTEXT

Component:
PaymentService

Purpose:
Handles payment creation and confirmation.

Architecture:
Business logic must remain provider-agnostic.

Important decision:
ADR-014 requires payment providers to use adapters.

Recent changes:
Webhook retry logic changed 3 commits ago.

Known issue:
Duplicate webhook events can produce
inconsistent order state.

Relevant files:
• payment.service.ts
• stripe.adapter.ts
• webhook.handler.ts
• order.service.ts

Tests:
• payment.service.spec.ts
• webhook.handler.spec.ts

Confidence:
94%
```

The agent can now work with much better context.

---

# 21. Privacy Architecture

Nivora should be **local-first by default**.

The developer's source code is sensitive.

Therefore:

```text
Code
 ↓
Local Nivora Engine
 ↓
Local Project Brain
```

Cloud services should be optional.

Users should be able to choose:

```text
Local Only

OR

Local + AI Provider

OR

Nivora Cloud
```

No project source code should be uploaded by default.

---

# 22. AI Provider Strategy

Nivora should be provider-agnostic.

Possible providers:

* OpenAI
* Anthropic
* Google
* local models
* other compatible providers

Nivora should not depend on one model.

The intelligence layer should be owned by Nivora.

AI models are replaceable components.

---

# 23. MVP Philosophy

Do NOT build the entire vision initially.

The MVP should prove one thing:

> **Can Nivora provide project context that developers find more useful than simply asking their existing AI coding agent?**

That is the critical hypothesis.

---

# 24. Nivora Context MVD

## Version 0.1

Build only:

### 1. VS Code Extension

A small Nivora sidebar.

### 2. Repository Scanner

Analyze:

* project structure
* source files
* imports
* important configuration
* README/docs

### 3. Git Analyzer

Read:

* recent commits
* changed files
* branches
* diffs

### 4. Project Map

Generate:

```text
Architecture
Components
Dependencies
Important Files
Recent Changes
```

### 5. Context Query

User asks:

> "What should I know before modifying X?"

Nivora returns:

* relevant files
* dependencies
* recent changes
* decisions/docs
* known risks
* evidence
* confidence

### 6. Context Health

Show:

```text
Project Context: 89%

Fresh:
Architecture
Dependencies
Recent Changes

Needs Review:
Payment documentation
```

That is enough for the first real product test.

---

# 25. What NOT to Build in MVP

Do not build:

* custom foundation model
* multi-agent orchestration
* cloud infrastructure
* team collaboration
* Slack integration
* Jira integration
* Notion integration
* production monitoring
* autonomous coding
* full AI IDE
* complex dashboard
* billing system
* token marketplace
* huge knowledge graph infrastructure
* dozens of AI providers

These are future possibilities.

They are distractions during validation.

---

# 26. Suggested Technical Architecture

```text
VS Code Extension
       │
       ▼
Nivora Core
       │
       ├── Workspace Scanner
       ├── Git Analyzer
       ├── Dependency Analyzer
       ├── Document Parser
       ├── Symbol Index
       ├── Context Engine
       └── Confidence Engine
                │
                ▼
        Project Knowledge Store
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
      Facts   Decisions  Changes
        │       │        │
        └───────┼────────┘
                ▼
         Context Retrieval
                │
                ▼
          Nivora Answers
```

---

# 27. Local Data Model

A simple initial model is enough.

```text
Project
 ├── Files
 ├── Symbols
 ├── Components
 ├── Dependencies
 ├── Decisions
 ├── Facts
 ├── Issues
 ├── Changes
 └── Relationships
```

Each knowledge item can contain:

```json
{
  "type": "fact",
  "content": "PostgreSQL is used as the primary database.",
  "source": [
    "docker-compose.yml",
    "prisma/schema.prisma"
  ],
  "confidence": 0.97,
  "last_verified": "2026-09-08"
}
```

---

# 28. Retrieval Strategy

Do not blindly dump the entire repository into an LLM.

Instead:

```text
User Question
      ↓
Intent Detection
      ↓
Relevant Project Entities
      ↓
Relevant Files
      ↓
Git History
      ↓
Decisions
      ↓
Known Risks
      ↓
Evidence Ranking
      ↓
Context Package
      ↓
Answer
```

The goal is:

> **Maximum useful context with minimum unnecessary context.**

---

# 29. Context Ranking

Each piece of information should receive a relevance score based on:

```text
Relevance
+
Recency
+
Source reliability
+
Relationship to target
+
Change frequency
+
User query intent
```

For example:

```text
payment.service.ts
Relevance: 99%

ADR-014
Relevance: 94%

commit 8fa31c
Relevance: 89%

README.md
Relevance: 41%
```

This is where the product can become genuinely intelligent.

---

# 30. The Nivora Context Card

A key UX primitive.

Whenever Nivora provides context:

```text
┌──────────────────────────────────────┐
│ PAYMENT SERVICE                      │
├──────────────────────────────────────┤
│ Purpose                              │
│ Processes payment transactions       │
│                                      │
│ Related                              │
│ StripeAdapter                        │
│ OrderService                         │
│ PaymentController                    │
│                                      │
│ Recent Changes                       │
│ 7 files changed in 14 days           │
│                                      │
│ Important Decision                   │
│ ADR-014                              │
│                                      │
│ Known Risk                           │
│ Duplicate webhook processing         │
│                                      │
│ Confidence                           │
│ ████████████████░ 91%                │
│                                      │
│ [View Evidence]                      │
└──────────────────────────────────────┘
```

This becomes a recognizable Nivora UX pattern.

---

# 31. Competitive Moat

The moat should NOT be:

> "We use AI."

Everyone does.

It should become a combination of:

### 1. Project Knowledge Graph

Persistent relationships between code, history, decisions and architecture.

### 2. Context Freshness

Knowing whether knowledge is still valid.

### 3. Evidence Layer

Every important claim has provenance.

### 4. Cross-Agent Accessibility

Claude, Codex, Gemini, etc. can query the same project brain.

### 5. Project History

Nivora understands how the project evolved.

### 6. Context Quality Metrics

Nivora can measure how well-understood a project is.

Over time this can become difficult to replicate because Nivora accumulates structured project knowledge.

---

# 32. The Long-Term Product Ladder

Nivora Context should be the foundation.

## Stage 1 — Context

Understand the project.

```text
Nivora Context
```

↓

## Stage 2 — Memory

Remember decisions and project history.

```text
Nivora Memory
```

↓

## Stage 3 — Intelligence

Analyze risks, drift, dependencies and impact.

```text
Nivora Intelligence
```

↓

## Stage 4 — Agent Interface

Give AI agents access to the project brain.

```text
Nivora MCP
```

↓

## Stage 5 — Engineering Control

Coordinate agents, tasks, permissions and execution.

```text
Nivora Control Plane
```

This means the earlier "AI Engineering Control Plane" idea does not disappear.

It becomes the **long-term destination**.

But Context is the foundation.

---

# 33. Potential Future Products

Eventually Nivora Labs could build:

```text
Nivora Context
        ↓
Nivora Memory
        ↓
Nivora Intelligence
        ↓
Nivora Agents
        ↓
Nivora Control Plane
```

All sharing the same underlying project intelligence layer.

---

# 34. Monetization

Do not monetize the first prototype aggressively.

First prove value.

Potential future model:

## Free

* local project indexing
* basic project map
* Git analysis
* limited context queries

## Pro

* advanced intelligence
* architecture drift
* impact analysis
* decision memory
* advanced context health
* AI integrations
* cloud synchronization

## Team

* shared project brain
* organization knowledge
* team decisions
* access control
* shared architecture
* audit history

## Enterprise

* self-hosting
* security controls
* private models
* SSO
* advanced governance
* compliance
* enterprise integrations

---

# 35. The Killer Demo

The first demo should NOT be:

> "Look, Nivora can chat about your code."

Everyone can do that.

Instead:

### Step 1

Open an unfamiliar repository.

### Step 2

Nivora scans it.

### Step 3

Show:

```text
PROJECT CONTEXT
89% confidence
```

### Step 4

Ask:

> "What should I know before changing authentication?"

### Step 5

Nivora produces:

```text
Authentication uses OAuth.

Relevant files:
...

Decision:
ADR-006

Recent change:
Commit 82fa21 modified token refresh.

Known risk:
Refresh token invalidation.

Documentation:
⚠ 38 days old.

Current implementation differs
from documented architecture.

Confidence: 87%
```

### Step 6

Click:

> "Show Evidence"

Nivora jumps directly into the relevant code, commit and document.

### Step 7

Ask:

> "What breaks if I change this?"

Nivora generates the dependency/impact map.

That is the moment where the product becomes interesting.

---

# 36. Success Metrics

The MVP should measure:

### Context usefulness

Do developers actually use Nivora's answers?

### Accuracy

Are the retrieved files and relationships correct?

### Evidence usage

Do users click evidence?

### Time saved

How much faster can developers understand an unfamiliar module?

### Context correction rate

How often does Nivora identify stale or incorrect information?

### Repeat usage

Do developers return to Nivora after the first session?

The strongest metric:

> **Does a developer prefer asking Nivora before asking their coding agent about unfamiliar project areas?**

---

# 37. Validation Plan

Before building months of infrastructure:

## Test 1 — Manual Prototype

Take 3–5 real repositories.

Build a lightweight script that generates:

* project map
* recent changes
* dependency relationships
* important docs
* context answers

Manually evaluate the results.

---

## Test 2 — VS Code Prototype

Build the extension.

Only support:

```text
Ask Nivora:
"What should I know before modifying X?"
```

---

## Test 3 — Developer Testing

Give it to:

* students
* developers
* AI-assisted developers
* people working on unfamiliar repositories

Measure:

```text
Was the answer useful?
Was it accurate?
Did evidence help?
Would you use this again?
```

---

# 38. The Critical Product Test

The project succeeds only if users say something like:

> "I could have asked Claude this, but Nivora already knew the important project history."

Or:

> "Nivora caught that the documentation was outdated."

Or:

> "I didn't know this decision existed until Nivora showed me."

Or:

> "Before touching a service, I check Nivora."

Those are strong signals.

If users instead say:

> "This is basically Copilot/Claude but with a dashboard."

Kill or pivot.

---

# 39. Product Principles

Nivora Context should follow these rules.

### Principle 1

**Never pretend certainty.**

### Principle 2

**Show evidence.**

### Principle 3

**Prefer current information.**

### Principle 4

**Respect developer privacy.**

### Principle 5

**Be provider-agnostic.**

### Principle 6

**Complement existing AI tools.**

### Principle 7

**Don't duplicate IDE functionality unnecessarily.**

### Principle 8

**Solve context quality, not merely context access.**

### Principle 9

**Start local-first.**

### Principle 10

**Build the smallest product that proves the thesis.**

---

# 40. Final Product Definition

## Nivora Context

> **Nivora Context is a local-first project intelligence layer that continuously builds an evidence-backed understanding of a software codebase, its history, architecture, decisions and current state — then delivers the right context to developers and AI agents when they need it.**

The ultimate goal is simple:

```text
TODAY

Developer
   ↓
AI Agent
   ↓
"Let me inspect your code..."

TOMORROW

Developer
   ↓
Nivora Project Brain
   ↓
"Here's what matters."
   ↓
AI Agent
   ↓
"Now I can work."
```

Nivora should not become another AI that writes code.

It should become the system that makes **every AI working on the codebase understand the codebase better.**

---

# 41. One-Sentence Pitch

> **Nivora Context is the persistent project brain that gives developers and AI agents the right, current, evidence-backed context before they touch a codebase.**

---

# 42. The Ultimate Ambition

The long-term Nivora architecture:

```text
                 Nivora
                    │
          ┌─────────▼─────────┐
          │  Project Brain    │
          │                   │
          │ Facts             │
          │ Decisions         │
          │ Architecture      │
          │ History           │
          │ Dependencies      │
          │ Risks             │
          │ Current Work      │
          │ Context Quality   │
          └─────────┬─────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
      Claude       Codex      Gemini
        │           │           │
        └───────────┼───────────┘
                    │
               Developer
```

And eventually:

```text
                 NIVORA LABS
                      │
        ┌─────────────┼─────────────┐
        │             │             │
     Context      Intelligence    Agents
        │             │             │
        └─────────────┼─────────────┘
                      │
               Control Plane
```

**Nivora Context is not the final product.**

It is the **foundation that makes the larger Nivora vision possible.**
