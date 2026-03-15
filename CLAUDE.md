# Claude Development Notes

This file contains development notes and commands for Claude Code to help with project workflow.

## Project Structure

- **Main Branch**: `main` - Stable production code
- **UI Development Branch**: `claude-ui` - All UI-related changes and experiments
- **Package Manager**: pnpm with turbo for monorepo management

## Common Commands

### Development
```bash
# Start development server
corepack pnpm --filter @soji/web dev

# Build project
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

### Git Workflow
```bash
# Switch to UI development branch
git checkout claude-ui

# Stage and commit UI changes
git add .
git commit -m "feat(ui): description of changes"

# Merge to main when ready
git checkout main
git merge claude-ui
git push
```

## UI Development Guidelines

1. **Always work on the `claude-ui` branch** for UI-related changes
2. Test changes thoroughly before merging to main
3. Use semantic commit messages with `feat(ui):` prefix for UI changes
4. Maintain the sky blue color theme (`#87ceeb` as primary)

## Current Theme

- **Primary Color**: Sky Blue (`#87ceeb`)
- **Background**: Multi-layer radial gradients for depth
- **Typography**: Inter font family with Georgia for display text
- **Layout**: Clean, modern design with proper spacing

## Development Server

The development server runs on `http://localhost:3001` (port 3000 is typically in use).

## Notes

- The project uses Next.js 15 with TypeScript
- Tailwind CSS for styling with custom color variables
- Images are optimized using Next.js Image component
- Book cover design includes 3D effects and visual depth