# RosenApp

A minimal chat application powered by [Rosenbridge](https://github.com/shivanshkc/rosenbridge).

## Prerequisites

- Node.js 20+
- npm 10+
- A running [Rosenbridge](https://github.com/shivanshkc/rosenbridge) backend server

## Setup

```bash
npm install
```

## Development

```bash
npm start
```

Opens at [http://localhost:4200](http://localhost:4200). The app expects the backend at `http://localhost:8080` by default.

To change the backend URL, edit `src/environments/environment.ts`:

```typescript
export const environment = {
  apiBaseUrl: 'http://localhost:8080',
};
```

## Tests

```bash
npm test
```

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Set your production backend URL in `src/environments/environment.production.ts` before building.
