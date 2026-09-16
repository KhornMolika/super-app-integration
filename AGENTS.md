# Agent Instructions & Guidelines

## Package Manager
- **Always use `pnpm`** for all commands, scripts, builds, and dependency management across all projects in this repository (never `npm` or `yarn`).
  - Example commands: `pnpm install`, `pnpm build`, `pnpm run build`, `pnpm dev`, `pnpm run lint`, `pnpm test`.

## UI / UX & Design Guidelines
- **Always use icons** across all UI components, buttons, interactive cards, status badges, action triggers, tables, form inputs, dialogs, notifications, and navigation elements to ensure a clear, modern, intuitive, and consistent visual experience.

## Git & Push Rules
- **Push code only if explicitly told to do so**: Never execute `git push` or push branches/commits to any remote repository unless the user specifically and explicitly commands you to do so. 

## Hardcode Credential Rule
- **Always check and remove hardcode credentail**: Never hardcode sensitive credentials, passwords, private keys, secrets, or API tokens in source code. Always use environment variables or secure configuration loaders.