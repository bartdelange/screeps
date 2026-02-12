# Contributing

## Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
yarn install
```

3. Create local env file:

```bash
cp .env.example .env
```

4. Start watch build:

```bash
yarn watch
```

## Pull Requests

- Keep PRs focused and small.
- Explain why the change is needed.
- Add testing notes for what you verified.
- Link related issues when relevant.

## Validation

Before opening a PR, run:

```bash
yarn build
```

