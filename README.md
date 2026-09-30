# LifeHub

A personal hub of small tools: Bills, Kitchen, Poker, Fantasy, Applications and Weather, behind a Cognito login with an invite-only admin page.

## Repository layout

```
apps/web/          React + Vite frontend (TypeScript; older tools are still .jsx)
services/api/      Lambda handlers in TypeScript, bundled per tool by the CDK stack
packages/shared/   types and zod schemas used by both apps/web and services/api
backend/           AWS CDK stack, plus the Lambdas not yet moved to services/api
```

The root `package.json` is an npm workspace. Run everything from the repo root:

| Command                                           | What it does                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `npm install`                                     | Installs every workspace                                                |
| `npm run dev`                                     | Starts the frontend at http://localhost:5173 against the production API |
| `npm run build`                                   | Builds the frontend into `apps/web/dist` (the CDK stack uploads this)   |
| `npm run lint` / `npm run typecheck` / `npm test` | ESLint, TypeScript, Vitest                                              |
| `npm run format`                                  | Prettier                                                                |

To point the frontend at a different backend, copy `apps/web/.env.example` to `apps/web/.env.local` and change the values. Defaults live in `apps/web/src/config.ts`.

Pushing to `main` deploys the frontend and backend to AWS (`.github/workflows/backend-deploy.yml`).

## Frontend structure

```
apps/web/src/
  app/          entry point, providers, router, auth guard
  features/     one folder per tool (tools move here as they're rewritten;
                applications/ is the reference example)
  components/   tools not yet rewritten
  shared/       api client, reusable UI, hooks, pure helpers, styles/tokens.css
  config.ts     every environment-specific value
```

Each feature folder has the same shape:

```
features/<tool>/
  index.ts        public entry; other features import only this
  <Tool>Page.tsx  page shell: layout and tabs, no logic
  api.ts          one async function per endpoint, built on shared/api/client
  queries.ts      TanStack Query hooks wrapping api.ts
  lib/            pure functions (math, formatting, sorting) with tests
  components/     one component per file, grouped by screen or tab
  types.ts
```

## Conventions

1. One job per file: one component, one hook, or one group of related pure functions. Name the file after its main export.
2. Split a component past about 200 lines, a function past about 50, or a component with more than 4 or 5 `useState` calls. ESLint warns on files over 300 lines.
3. Calculations belong in `lib/` as tested pure functions; components only render.
4. Load API data with TanStack Query, not `useEffect` + `fetch`. Local UI state stays in `useState`.
5. Only `api.ts` files talk to the network, and only through `shared/api/client.ts`.
6. Features don't import from each other's internals. Anything two features need goes in `shared/`.
7. Colors and spacing come from `shared/styles/tokens.css`, not hex values in JSX.
8. `PascalCase.tsx` for components, `useCamelCase.ts` for hooks, `camelCase.ts` otherwise, lowercase folder names.
9. No file-wide `eslint-disable`. Disable a single line with a reason when you must.

## Backend structure

Each tool in `services/api/src/<tool>/` is split the same way:

```
handler.ts      route table: "METHOD /path" -> route, wrapped by shared/createHandler
routes/         one file per endpoint: validate input with a shared zod schema, call the service
service.ts      business rules
repository.ts   every DynamoDB call for the tool
```

`shared/createHandler.ts` does what every Lambda needs: reads the caller from the Cognito token, loads their profile, checks access, parses JSON, adds CORS headers and turns thrown `HttpError`s into `{ error }` responses. Tools open to every user (`access: "user"`) skip the profile read. Its optional settings (`countsAsUse`, `jsonBody`, `internalErrorMessage`) exist so moved Lambdas keep their exact responses.

The CDK stack bundles each handler with esbuild (`NodejsFunction`). When moving a Lambda over, keep its construct id so CloudFormation updates it in place, and compare `npx cdk synth` against `main` before merging.
