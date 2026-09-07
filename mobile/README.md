# nowry-mobile

The Expo + React Native client. Empty until **MOB-005**, which scaffolds the Expo app
and the EAS build profiles.

It is declared as a workspace now so the monorepo shape is settled before any code
lands, and so the frontend deploy's install behaviour is proven against the real
workspace layout rather than against a layout that does not exist yet.

Two things MOB-005 must get right:

- **Metro `watchFolders`** must include the repository root, or Metro will not resolve
  `@nowry/core` from outside `mobile/`.
- **The deploy must not install this workspace.** `.github/workflows/frontend-deploy.yml`
  runs `npm ci` at the repository root and only builds the web client; React Native and
  Expo have no business in that job.
