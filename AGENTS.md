# AGENTS.md - Alapaki Tools Development Guide

This document provides guidelines for agentic coding tools working on the Alapaki Tools Obsidian plugin.

## Build/Lint/Test Commands

### Development
```bash
npm run dev  # Start development server with Vite
```

### Building
```bash
npm run build  # Full build with type checking
npm run build-only  # Build without type checking
npm run build:watch  # Watch mode for development
```

### Type Checking
```bash
npm run type-check  # Run TypeScript type checking with vue-tsc
```

### Linting
```bash
npm run lint  # Run ESLint with auto-fix
```

### Preview
```bash
npm run preview  # Preview built files
```

### Testing
- No dedicated test framework is configured
- Manual testing is expected through Obsidian plugin usage
- For unit testing, you would need to set up a test framework (Jest/Vitest)

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2020
- **Module**: ESNext
- **Strict Mode**: Enabled (strictNullChecks, noImplicitAny, etc.)
- **Module Resolution**: Bundler
- **JSX**: Preserve
- **Base URL**: "." with path alias "@/*" -> "src/*"

### Imports
- Use ES modules (`import/export` syntax)
- Group imports by type: built-in, external, internal
- Use path aliases for internal imports: `@/path/to/file`
- Avoid wildcard imports when possible

### Formatting
- **Indentation**: 4 spaces (as seen in existing code)
- **Quotes**: Single quotes for strings, double quotes for JSX
- **Semicolons**: Required
- **Line Length**: No strict limit, but keep lines readable
- **Braces**: Opening braces on same line for functions/classes

### Types
- Use TypeScript interfaces for complex types
- Prefer type inference where possible
- Use generics for reusable components
- Avoid `any` type - use proper typing

### Naming Conventions
- **Variables/Functions**: camelCase
- **Classes/Types**: PascalCase
- **Constants**: UPPER_CASE
- **Files**: kebab-case.ts
- **Components**: PascalCase.vue
- **Private Members**: Prefix with underscore `_`

### Error Handling
- Use try/catch for async operations
- Provide meaningful error messages
- Use Obsidian's `Notice` for user-facing errors
- Log technical errors to console

### Vue Components
- Use Composition API with `<script setup>`
- Use Pinia for state management
- Follow Vue 3 best practices
- Use proper typing for props and emits

### Obsidian Integration
- Extend `Plugin` class for main plugin
- Use Obsidian's API for editor operations
- Register commands with proper IDs
- Handle both MarkdownView and MarkdownFileInfo contexts

### AI Integration
- Use OpenAI SDK for AI operations
- Handle API keys securely
- Provide fallback behavior when AI fails
- Use axios for HTTP requests

### Image Processing
- Use canvas for client-side image processing
- Handle different image formats (WEBP, AVIF, PNG, JPEG)
- Provide compression options
- Handle errors gracefully

## Project Structure

```
src/
  main.ts                # Main plugin entry point
  settings.ts            # Plugin settings management
  interfaces.ts          # TypeScript interfaces
  utils.ts               # Utility functions
  contextmenu.ts         # Context menu registration
  ocr-utils.ts           # Image processing utilities
  modals/                # Modal components
  latex_symbols/         # LaTeX symbol definitions
  libs/                  # Library utilities
```

## Development Workflow

1. **Setup**: Run `npm install` to install dependencies
2. **Development**: Use `npm run dev` for hot-reloading
3. **Building**: Use `npm run build` for production builds
4. **Testing**: Manual testing in Obsidian
5. **Linting**: Run `npm run lint` before commits
6. **Type Checking**: Run `npm run type-check` before commits

## Best Practices

- Keep functions small and focused
- Use async/await for asynchronous code
- Document complex logic with comments
- Handle edge cases gracefully
- Follow Obsidian plugin development guidelines
- Keep dependencies updated
- Write clean, maintainable code

## Common Patterns

### Plugin Commands
```typescript
this.addCommand({
  id: 'command-id',
  name: 'Command Name',
  editorCallback: async (editor, view) => {
    // Command implementation
  }
});
```

### Modal Usage
```typescript
import { Modal } from 'obsidian';

export class MyModal extends Modal {
  constructor(app: App) {
    super(app);
  }
  
  onOpen() {
    // Modal setup
  }
  
  onClose() {
    // Cleanup
  }
}
```

### Settings Management
```typescript
interface PluginSettings {
  settingName: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  settingName: 'default'
};
```

## External Dependencies

- **Vue 3**: Frontend framework
- **Pinia**: State management
- **Axios**: HTTP client
- **OpenAI SDK**: AI integration
- **Zod**: Schema validation
- **TailwindCSS**: Styling

## Notes

- This is an Obsidian plugin, so all code runs in the browser context
- Use Obsidian's API for file operations and editor interactions
- Be mindful of performance for large image processing
- Handle errors gracefully to avoid breaking the user experience