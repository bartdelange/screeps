# Screeps Bot

TypeScript Screeps AI with role-based creep behavior, spawn planning, link/tower automation, and retirement logic.

## Requirements

- Node.js 18+
- Yarn 4.x
- Screeps client installed locally

## Quick Start

1. Install dependencies:

```bash
yarn install
```

2. Create local config files:

```env
cp screeps.sample.json screeps.json
```

3. Build once:

```bash
yarn build
```

4. Watch local build:

```bash
yarn watch
```

## Scripts

- `yarn build`: build locally (`DEST=local`, no upload)
- `yarn build:main`: upload using `screeps.json.main`
- `yarn build:pserver`: upload using `screeps.json.pserver`
- `yarn watch`: local watch build
- `yarn watch:main`: watch + upload using `screeps.json.main`
- `yarn watch:pserver`: watch + upload using `screeps.json.pserver`

For private servers with custom certificates, pserver scripts run with `NODE_OPTIONS=--use-system-ca`.

## Architecture

- `src/main.ts`: game loop orchestration
- `src/roles/`: role runners (`harvester`, `miner`, `mover`, `builder`, `upgrader`)
- `src/spawning/`: spawn planning, intent generation, retire planning
- `src/behaviors/`: reusable action logic and policies
- `src/links/`: link role detection and transfer management
- `src/towers/`: tower combat/heal management

## Environment Variables

Loaded via `dotenv` in `rollup.config.js`.

- `DEST`: target profile (`local`, `main`, `pserver`)

Upload credentials and targets live in `screeps.json` (copied from `screeps.sample.json`).

## Contributing

See `CONTRIBUTING.md`.

## Security

See `SECURITY.md`.

## License

MIT, see `LICENSE`.
