# fun-ai-claw

Frontend admin console for managing claw instances.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Ant Design
- Nextra docs theme

## Run

Edit the console password config first:

```ts
src/config/console-access.ts
```

For example:

```ts
export const consoleAccessConfig = {
  password: "your-password",
  sessionMaxAgeSeconds: 60 * 60 * 12,
} as const;
```

Then start the app:

```bash
npm install
npm run dev:local
```

`/fun-claw/console` is protected by the password configured in `src/config/console-access.ts`.

## Environment Profiles

Frontend runtime config is now split by profile files:

```text
src/config/app-config.local.ts
src/config/app-config.staging.ts
src/config/app-config.prod.ts
```

Current active profile is recorded in:

```bash
src/config/app-profile.ts
```

Switch profile without environment variables:

```bash
npm run profile:local
npm run profile:staging
npm run profile:prod
```

Common commands:

```bash
npm run dev:local
npm run dev:staging
npm run dev:prod

npm run build:local
npm run build:staging
npm run build:prod
```

Profile meanings:

- `local`: frontend runs on Windows/local, API defaults to `http://127.0.0.1:8080`
- `staging`: reserved for your internal server deployment
- `prod`: keeps the current online reverse-proxy style paths such as `/fun-claw/api`

`defaultHostId` is the fixed host UUID used when creating instances in single-host deployments.

If your local Windows machine cannot access the current user center address, edit:

```text
src/config/app-config.local.ts
```

## Routes

- Dashboard: `http://localhost:3000/fun-claw`
- Console: `http://localhost:3000/fun-claw/console`
- Docs portal (Nextra): `http://localhost:3000/fun-claw/docs`
