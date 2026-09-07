# nowry

Nowry's **frontend clients** and the logic they share. This repository is an npm
workspace root with three parts:

| Path | What it is |
|---|---|
| `src/`, `public/` | the web client — React 18 + Joy UI, built by Create React App |
| `packages/core/` | `@nowry/core` — platform-free logic shared by both clients |
| `mobile/` | the Expo + React Native client (scaffolded by MOB-005) |

The backend lives in a separate repository, `dirias/Nowry-API`. The planning documents
that govern all of it — PRDs, ADRs and tasks — live in the `Nowry/` planning repository
one level up.

Install once at the repository root; the workspaces link automatically.

    npm install

See `packages/core/README.md` before adding anything to the shared package: it carries
no JSX and no browser globals, and both rules are load-bearing.

# requirements

- Node 18 +
