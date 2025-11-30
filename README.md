# Order System Mock Prototype

This repository hosts a mobile-first mock for the event ordering system described in `docs/mock_requirements.md`. The prototype focuses on realistic front-end flows (menu browsing, cart creation, QR issuance, and simulated sold-out notification) without needing a backend.

## Project layout
- `frontend/`: Next.js + MUI prototype built with pnpm (App Router, TypeScript).
- `docs/mock_requirements.md`: Detailed requirements for the front-end mock.

## Getting started (frontend)
1. Install dependencies: `pnpm install`
2. Run the dev server: `pnpm dev`
3. Open the app at http://localhost:3000 on a mobile viewport to verify menu browsing, cart operations, and the 10-second sold-out notification after QR generation.

Notes:
- Behavior is intentionally mocked; QR payloads are generated on the client for demo purposes.
- The UI is designed for a vertical, smartphone-first layout.
