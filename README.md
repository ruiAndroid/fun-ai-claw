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
npm run dev
```

`/fun-claw/console` is protected by the password configured in `src/config/console-access.ts`.

Set API endpoint:

```bash
src/config/app-config.ts
```

Edit `controlApiBaseUrl`, for example:

```ts
export const appConfig = {
  controlApiBaseUrl: "/fun-claw/api",
  uiControllerBaseUrl: "/fun-claw/ops/ui-controller",
  defaultHostId: "00000000-0000-0000-0000-000000000108",
} as const;
```

`defaultHostId` is the fixed host UUID used when creating instances in single-host deployments.

## Routes

- Dashboard: `http://localhost:3000/fun-claw`
- Console: `http://localhost:3000/fun-claw/console`
- Docs portal (Nextra): `http://localhost:3000/fun-claw/docs`
