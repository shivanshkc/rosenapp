# RosenApp

A real-time chat application built with Angular and powered by [Rosenbridge](https://github.com/shivanshkc/rosenbridge). Features include user authentication, WebSocket-based messaging, and a Material Design interface with dark and light theme support.

## Tech Stack

- Angular 21 (standalone components)
- Angular Material and CDK
- TypeScript 5.9

## Prerequisites

- Node.js 20+
- npm 10+
- A running [Rosenbridge](https://github.com/shivanshkc/rosenbridge) backend server

## Setup

```bash
npm install
```

## Configuration

The app loads its backend URL from `public/config.json` at startup:

```json
{
  "apiBaseUrl": "https://rosenbridge.shivansh.io"
}
```

Change this to point to your own Rosenbridge instance if needed.

## Common Commands

```bash
npm start     # Starts the dev server at http://localhost:4200
npm run watch # For continuous rebuilds during development
npm test      # Run unit tests
npm run build # Production build, written to dist/
```

## Project Structure

```
src/app/
├── pages/          # Login, Register, Home
├── services/       # Auth, API, WebSocket, AppConfig
├── shared/         # Validation helpers, notification sounds
├── app.routes.ts   # Route definitions with guards
└── app.ts          # Root component
```
