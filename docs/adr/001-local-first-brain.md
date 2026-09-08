---
id: ADR-001
title: Local-First Deterministic Project Brain Architecture
status: active
date: 2026-09-08
reason: Ensure sub-50ms query latency, zero UI blocking, and developer privacy by computing context locally without mandatory remote LLM calls.
affected:
  - src/core/brain/ProjectBrain.ts
  - src/core/cache/CacheManager.ts
  - src/core/query/QueryEngine.ts
---

# ADR-001: Local-First Deterministic Project Brain Architecture

## Status
Active (Accepted: 2026-09-08)

## Context
AI coding agents need evidence-backed context, but sending entire repositories to remote models introduces high latency, cost, and security/privacy concerns. Furthermore, IDE extensions must never block the main editor thread.

## Decision
1. All repository indexing, AST dependency extraction, and Git churn analysis are executed locally.
2. The Project Brain maintains an in-memory cache with debounced disk persistence in `.nivora/cache.json`.
3. The "What Should I Know Before Modifying This?" query resolves deterministically from local Git, ADRs, and import graphs with sub-50ms latency.

## Consequences
- Developers get instant, reliable context even when offline.
- No source code or secrets leave the developer's machine.
- External AI models can consume this context via the Model Context Protocol (MCP) or markdown clipboard handoff.
