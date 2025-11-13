# SMQS Testing Guide

## Overview
This document outlines the testing strategy for the Smart Medical Queue System.

## Test Structure

### Unit Tests
Located in `__tests__/` directory with file naming: `*.test.ts`

- **Queue Engine Tests** (`queue-engine.test.ts`)
  - Patient queue operations
  - Position calculations
  - Wait time estimates
  - Consultation lifecycle

- **Storage Tests** (`storage.test.ts`)
  - localStorage operations
  - Data persistence
  - Appointment management

- **Notification Tests** (`notifications.test.ts`)
  - Notification creation
  - Subscription system
  - Auto-dismiss functionality

### Integration Tests
(To be added) - Test data flow between components and services

### E2E Tests
(To be added) - Test complete user workflows

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run specific test file
npm test queue-engine.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
\`\`\`

## Coverage Goals
- Branches: 50%+
- Functions: 50%+
- Lines: 50%+
- Statements: 50%+

## Future Enhancements
- Integration tests for API routes
- E2E tests with Playwright
- Performance benchmarks
- Load testing for queue operations
