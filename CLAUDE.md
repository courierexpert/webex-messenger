# CLAUDE.md - AI Assistant Guide for webex-messenger

## Project Overview

**webex-messenger** is a messaging application designed to integrate with Cisco Webex. This document provides comprehensive guidance for AI assistants working on this codebase.

### Project Status
- **Current State**: New project / Initial setup phase
- **Primary Goal**: Build a robust messaging application with Webex integration
- **Target Platform**: TBD (Web, Desktop, Mobile, or Multi-platform)

---

## Recommended Codebase Structure

When building this project, follow this structure:

```
webex-messenger/
├── .github/                    # GitHub workflows and templates
│   └── workflows/
│       ├── ci.yml             # Continuous integration
│       └── release.yml        # Release automation
├── docs/                      # Project documentation
│   ├── API.md                # API documentation
│   ├── ARCHITECTURE.md       # Architecture decisions
│   └── DEPLOYMENT.md         # Deployment guide
├── src/                      # Source code
│   ├── api/                  # API client and endpoints
│   ├── components/           # UI components (if applicable)
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript type definitions
│   ├── config/               # Configuration management
│   └── index.ts              # Main entry point
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── scripts/                  # Build and utility scripts
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
├── README.md                # Project README
├── LICENSE                  # License file
└── CLAUDE.md                # This file
```

---

## Technology Stack Recommendations

### Core Technologies
- **Language**: TypeScript (for type safety and better DX)
- **Runtime**: Node.js (v18+ or v20+ LTS)
- **Package Manager**: npm or pnpm (prefer pnpm for performance)

### Webex Integration
- **SDK**: `@webex/webex` or `webex` official SDK
- **Authentication**: OAuth 2.0 or Bot tokens
- **APIs**: Webex REST API, Webex Websockets for real-time

### Framework Options (Choose based on requirements)
- **CLI Application**: Commander.js or Yargs
- **Web Application**: React, Vue, or Svelte
- **Desktop Application**: Electron
- **Backend/Bot**: Express.js or Fastify

### Essential Libraries
- **HTTP Client**: axios or node-fetch
- **WebSocket**: ws or socket.io-client
- **Testing**: Jest or Vitest
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Logging**: winston or pino

---

## Development Workflows

### Initial Setup Workflow
1. **Initialize Project**
   - Set up package.json with appropriate scripts
   - Configure TypeScript (strict mode recommended)
   - Set up linting and formatting
   - Create .gitignore (include node_modules, .env, dist/)

2. **Configure Development Environment**
   - Set up .env.example with required variables
   - Document environment variables
   - Set up hot reload for development

3. **Establish Project Structure**
   - Create directory structure as outlined above
   - Set up index files with basic exports
   - Add initial configuration files

### Feature Development Workflow
1. **Planning**
   - Understand requirements clearly
   - Check existing code for similar patterns
   - Plan file structure and modifications

2. **Implementation**
   - Write code following established patterns
   - Add appropriate error handling
   - Include logging for debugging
   - Follow security best practices

3. **Testing**
   - Write unit tests for new functions
   - Add integration tests for API interactions
   - Test edge cases and error scenarios

4. **Documentation**
   - Add JSDoc comments for functions
   - Update README if public APIs change
   - Document any new environment variables

### Git Workflow
1. **Branch Naming**
   - Features: `feature/description`
   - Fixes: `fix/description`
   - Docs: `docs/description`
   - AI branches: `claude/claude-md-*` (auto-generated)

2. **Commit Messages**
   - Use conventional commits format
   - Examples:
     - `feat: add message sending functionality`
     - `fix: resolve authentication token expiry`
     - `docs: update API documentation`
     - `refactor: simplify message parsing logic`
     - `test: add tests for webhook handler`

3. **Pre-commit Checks**
   - Run linting: `npm run lint`
   - Run tests: `npm test`
   - Check types: `npm run type-check`

---

## Code Conventions

### TypeScript Guidelines
```typescript
// Use explicit types for function parameters and returns
function sendMessage(roomId: string, text: string): Promise<Message> {
  // Implementation
}

// Use interfaces for object shapes
interface Message {
  id: string;
  roomId: string;
  text: string;
  personId: string;
  created: Date;
}

// Use enums for fixed sets of values
enum MessageType {
  Text = 'text',
  File = 'file',
  Card = 'card'
}

// Use strict null checks
function getUser(id: string): User | null {
  // Returns User or null, never undefined
}
```

### File Naming
- **TypeScript files**: camelCase.ts (e.g., `messageService.ts`)
- **Component files**: PascalCase.tsx (e.g., `MessageList.tsx`)
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Type definition files**: `*.types.ts`
- **Configuration files**: kebab-case.config.ts

### Import Organization
```typescript
// 1. External dependencies
import { Webex } from '@webex/webex';
import axios from 'axios';

// 2. Internal modules (absolute imports)
import { MessageService } from '@/services/messageService';
import { logger } from '@/utils/logger';

// 3. Types
import type { Message, Room } from '@/types';

// 4. Relative imports (if necessary)
import { helper } from './helper';
```

### Error Handling
```typescript
// Always use custom error classes for domain errors
class WebexAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebexAuthError';
  }
}

// Use try-catch for async operations
async function fetchMessages(roomId: string): Promise<Message[]> {
  try {
    const response = await webex.messages.list({ roomId });
    return response.items;
  } catch (error) {
    logger.error('Failed to fetch messages', { roomId, error });
    throw new WebexApiError('Failed to fetch messages', { cause: error });
  }
}

// Validate inputs early
function validateRoomId(roomId: string): void {
  if (!roomId || typeof roomId !== 'string') {
    throw new ValidationError('Invalid room ID');
  }
}
```

### Logging Best Practices
```typescript
// Use structured logging
logger.info('Message sent', {
  roomId: 'abc123',
  messageId: 'msg456',
  userId: 'user789'
});

// Log levels:
// - error: Errors that need attention
// - warn: Warning conditions
// - info: Informational messages
// - debug: Debug information (disabled in production)
```

---

## Security Best Practices

### Environment Variables
- **NEVER** commit secrets or API tokens
- Always use .env files (excluded from git)
- Validate all environment variables on startup
- Required variables:
  ```
  WEBEX_ACCESS_TOKEN=your_token_here
  WEBEX_BOT_TOKEN=your_bot_token (if applicable)
  LOG_LEVEL=info
  NODE_ENV=development|production
  ```

### API Security
- Validate all inputs from external sources
- Sanitize user inputs before processing
- Use rate limiting for API endpoints
- Implement request timeouts
- Never log sensitive data (tokens, passwords, PII)

### Dependency Management
- Regularly update dependencies: `npm audit fix`
- Review security advisories: `npm audit`
- Pin major versions to avoid breaking changes
- Use lock files (package-lock.json or pnpm-lock.yaml)

---

## Testing Strategy

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies (Webex SDK, HTTP clients)
- Aim for >80% code coverage
- Location: `tests/unit/`

### Integration Tests
- Test interactions with Webex API (use test accounts)
- Test database operations (if applicable)
- Test message flow end-to-end
- Location: `tests/integration/`

### Test Structure
```typescript
describe('MessageService', () => {
  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      // Arrange
      const roomId = 'test-room-id';
      const text = 'Hello, World!';

      // Act
      const result = await messageService.sendMessage(roomId, text);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBe(text);
    });

    it('should throw error when roomId is invalid', async () => {
      // Arrange & Act & Assert
      await expect(
        messageService.sendMessage('', 'text')
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

---

## AI Assistant Guidelines

### When Starting a Task
1. **Understand Context**: Read relevant code before making changes
2. **Check Existing Patterns**: Follow established patterns in the codebase
3. **Plan First**: For complex tasks, outline the approach before coding
4. **Use TodoWrite**: Track multi-step tasks with the todo list

### Code Quality Standards
- Write clean, readable, self-documenting code
- Add comments only when necessary (why, not what)
- Follow DRY principle (Don't Repeat Yourself)
- Keep functions small and focused (single responsibility)
- Prefer composition over inheritance
- Use descriptive variable and function names

### Making Changes
1. **Read Before Edit**: Always read files before editing
2. **Preserve Style**: Match existing code style and patterns
3. **Test Changes**: Verify changes work as expected
4. **Update Tests**: Add or update tests for modified code
5. **Document Changes**: Update relevant documentation

### Common Pitfalls to Avoid
- ❌ Don't commit commented-out code
- ❌ Don't use `any` type in TypeScript (use `unknown` if necessary)
- ❌ Don't ignore errors or use empty catch blocks
- ❌ Don't hardcode configuration values
- ❌ Don't skip input validation
- ❌ Don't write overly complex functions
- ❌ Don't create files unnecessarily (prefer editing existing files)

### Webex-Specific Considerations
- **Rate Limiting**: Webex API has rate limits; implement retry logic
- **Webhooks**: Use webhooks for real-time events when possible
- **Authentication**: Handle token expiration and refresh
- **Pagination**: Many Webex APIs return paginated results
- **Error Codes**: Handle Webex-specific error codes appropriately

### Performance Considerations
- Cache frequently accessed data
- Use pagination for large datasets
- Implement connection pooling for HTTP clients
- Use WebSockets for real-time features
- Avoid N+1 query problems

---

## Build and Deployment

### Build Scripts (to be added to package.json)
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### Deployment Checklist
- [ ] All tests passing
- [ ] No linting errors
- [ ] Environment variables documented
- [ ] README updated
- [ ] Security audit passed (`npm audit`)
- [ ] Build successful
- [ ] Dependencies up to date

---

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify token is valid and not expired
   - Check token has required scopes
   - Ensure correct token type (bot vs user)

2. **Rate Limiting**
   - Implement exponential backoff
   - Cache responses when possible
   - Batch requests when API supports it

3. **WebSocket Connection Issues**
   - Implement reconnection logic
   - Handle connection timeouts
   - Log connection state changes

4. **Message Sending Failures**
   - Verify room ID is valid
   - Check user has permission to send messages
   - Validate message format

---

## Resources

### Webex Documentation
- [Webex Developer Portal](https://developer.webex.com/)
- [Webex API Reference](https://developer.webex.com/docs/api/getting-started)
- [Webex SDK Documentation](https://github.com/webex/webex-js-sdk)
- [Webex Bot Guide](https://developer.webex.com/docs/bots)

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### Testing Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Change Log

### [Current] - Initial Setup
- Created CLAUDE.md with comprehensive AI assistant guidelines
- Defined project structure and conventions
- Established development workflows

---

## Contact and Support

- **Repository**: courierexpert/webex-messenger
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Keep docs/ directory updated

---

**Last Updated**: 2025-11-20
**Document Version**: 1.0.0

This document should be updated as the project evolves and new patterns emerge.
