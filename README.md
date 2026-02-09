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

2. Create local environment file:

```bash
cp .env.example .env
```

3. Configure deployment target in `.env`:

```env
SCREEPS_SERVER=your_server_name
SCREEPS_BRANCH=default
# Optional path override:
# SCREEPS_DIR=/absolute/path/to/Screeps/scripts/server/branch
```

4. Build once:

```bash
yarn build
```

5. Watch and auto-copy:

```bash
yarn watch
```

## Scripts

- `yarn build`: build `dist/main.js` and copy to Screeps scripts directory
- `yarn watch`: watch mode build + copy on changes

## Architecture

- `src/main.ts`: game loop orchestration
- `src/roles/`: role runners (`harvester`, `miner`, `mover`, `builder`, `upgrader`)
- `src/spawning/`: spawn planning, intent generation, retire planning
- `src/behaviors/`: reusable action logic and policies
- `src/links/`: link role detection and transfer management
- `src/towers/`: tower combat/heal management

## Environment Variables

Loaded via `dotenv` in `rollup.config.mjs`.

- `SCREEPS_SERVER`: Screeps local/private server directory name
- `SCREEPS_BRANCH`: Screeps branch name
- `SCREEPS_DIR`: explicit full destination path for deployed `main.js`

## Contributing

See `CONTRIBUTING.md`.

## Security

See `SECURITY.md`.

## License

MIT, see `LICENSE`.

