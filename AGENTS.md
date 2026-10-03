# AGENTS.md - Piano Sight-Reading PWA

Refer to [GEMINI.md](./GEMINI.md) for full architectural guidelines and technical agreements:
- **Stack**: TypeScript + React SPA + Web Audio API (PWA).
- **Core Domain**: `src/lib/domain/` (Pure TypeScript, zero React dependencies).
- **Testing**: Vitest (`npm test`).
- **Acoustic Rule**: Silent visual feedback during live microphone listening to eliminate Larsen audio feedback loops.
- **Workflow**: OpenSpec + TDD (Red-Green-Refactor).
