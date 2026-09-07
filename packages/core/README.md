# @nowry/core

The product logic the Nowry web and mobile clients share: API services, data hooks,
contexts, constants, locales and design tokens. Consumed directly as source by both
clients. There is no build step.

## Two rules

**No JSX** (ADR-031). `react-scripts` 5 transpiles JSX only under `nowry/src`, and
webpack resolves this package to its real path outside that directory. Write providers
with `React.createElement`. Metro has no such limit, but the rule is the same on both
sides so the package stays consumable by either.

**No browser globals** (ADR-026). No `window`, `document`, `localStorage`,
`sessionStorage` or `navigator`; no `react-dom`, no `@mui/*`, and nothing under
`src/components`. Whatever the environment provides arrives through the platform port
(MOB-002), which each client configures once at startup.

A module here also never returns a React component. Data that needs an icon returns an
icon _key_; each client maps it to its own icon set (MOB-003B, MOB-014).

## Layout

    platform/   the port: interface + configurePlatform()   (MOB-002, done)
                storage · notify · auth · env · telemetry · session
    api/        client + 27 services                        (MOB-003, done)
    hooks/      data and form hooks                          (MOB-004)
    context/    Auth, Agent, Pomodoro whole; Notification and
                Subscription as state only                   (MOB-004)
    constants/  prompts.js moved with the api (MOB-003); the rest in MOB-004
    utils/  locales/  tokens/                                (MOB-004)

`boundary.js` is the permanent smoke module for the rules above. Leave it in place.

## Tests

Run from the repository root:

    npx jest --config packages/core/jest.config.js

They run with `testEnvironment: node`, so a browser global that sneaks in fails here
before it reaches a client.
