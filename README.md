# Production Debugging Interview - Code Repository

This is a unified TypeScript codebase containing realistic production code with intentional bugs for debugging interview scenarios. Candidates will investigate observability data (metrics, traces, logs) and correlate findings with this code to identify root causes.

---

## Repository Structure

```
interview-app/
├── src/                          # Unified application codebase
│   ├── lib/                      # Infrastructure layer
│   │   ├── config.ts             # Configuration management
│   │   ├── logger.ts             # Structured logging
│   │   ├── metrics.ts            # Metrics collection
│   │   ├── cache.ts              # Cache client
│   │   ├── database/             # Database layer
│   │   │   ├── client.ts         # DB connection pool
│   │   │   ├── migrations.ts     # Schema migrations
│   │   │   └── transactions.ts   # Transaction helpers
│   │   └── external-apis/        # External service clients
│   │       ├── validation-service.ts
│   │       ├── payment-gateway.ts
│   │       └── email-provider.ts
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── api.ts                # API request/response types
│   │   ├── job.ts                # Background job types
│   │   ├── workflow.ts           # Workflow types
│   │   └── user.ts               # User types
│   │
│   ├── api/                      # REST API server
│   │   ├── server.ts             # Express server setup
│   │   ├── middleware/           # API middleware
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   ├── error-handler.ts
│   │   │   └── request-logging.ts
│   │   └── routes/               # API endpoints
│   │       ├── health.ts
│   │       ├── workflows/        # Workflow endpoints
│   │       ├── users/            # User management
│   │       ├── data/             # Data operations
│   │       └── reports/          # Report generation
│   │
│   └── services/                 # Backend services
│       ├── job-scheduler/        # Background job scheduling ⚠️
│       ├── workflow-engine/      # Workflow execution
│       ├── workflow-service/     # Workflow operations
│       ├── notification-service/ # Email/webhook notifications
│       ├── user-service/         # User management
│       └── data-service/         # Data import/export
│
├── docs/
│   └── INTERVIEW_GUIDE.md        # For interviewers only
├── package.json
├── tsconfig.json
└── README.md                     # This file
```

---

## Debugging Scenarios

This codebase contains bugs for two production debugging scenarios. Your task is to investigate the issues using the observability platform and locate the problematic code in this repository.

### Scenario 1: System Unresponsiveness - Hourly Pattern

**Symptoms:** The entire platform becomes unresponsive every hour on the hour. API requests time out and workflows fail to start. Happens at 12:00, 13:00, 14:00, etc., lasting 2-3 minutes each time.

**Your task:** Use the observability tools to identify the root cause and locate the buggy code.

---

### Scenario 2: API Timeout Cascade

**Symptoms:** Multiple API endpoints are timing out. Users see 'Request timeout' or 'Database unavailable' errors. Database CPU and disk are normal, but connection pool shows 100% utilization.

**Your task:** Use the observability tools to identify the root cause and locate the buggy code.

---

## Architecture Overview

This is a realistic production application with the following components:

### API Layer (`src/api/`)
- Express-based REST API
- Authentication, validation, error handling middleware
- Routes for workflows, users, data operations, reports

### Services Layer (`src/services/`)
- **Job Scheduler**: Background job scheduling and execution
- **Workflow Engine**: Workflow state machine and step execution
- **Notification Service**: Email, webhook, and push notifications
- **User Service**: User management and permissions
- **Data Service**: Data import/export/transformation

### Infrastructure (`src/lib/`)
- Database client with connection pooling
- Redis-backed caching
- Structured JSON logging
- Metrics collection (counters, gauges, histograms)
- External API clients

---

## Key Features

### Database Connection Pool
- 200 connections max (configurable)
- Connection timeout: 10 seconds
- Tracks connection state: active, idle, idle_in_transaction
- Queue management for waiting requests

### Transaction Management
- Prisma-style transaction API
- Timeout support
- Transaction duration tracking
- Long-running transaction warnings

### Background Jobs
- Job scheduling with cron-like timing
- Multiple job types: data-sync, email, reports, cleanup
- Retry logic with exponential backoff
- Job queue management

### Observability
- Structured JSON logging
- Metrics: counters, gauges, histograms
- Request tracing with trace IDs
- Connection pool metrics
- Job execution metrics

---

## Installation & Setup

```bash
# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env

# Build TypeScript
npm run build

# Run tests
npm test
```

---

## For Interview Candidates

**DO NOT modify this code.** Your task is to:

1. **Investigate** the observability data (metrics, traces, logs, database analyzer)
2. **Identify** the root cause using systematic investigation
3. **Locate** the buggy code in this repository
4. **Explain** what's wrong and why it causes the observed symptoms
5. **Propose** fixes and architectural improvements

---

## For Interviewers

### Scenario Setup

1. **Observability Platform**: Candidates use `/observability-platform` to view metrics, traces, logs
2. **Code Repository**: This repository contains the application code (read-only)
3. **Time Limit**: 15-18 minutes per scenario
4. **Deliverables**: 
   - Root cause explanation
   - Code location(s)
   - Proposed fixes
   - Discussion of prevention

### Evaluation Criteria

**Minimum (Pass):**
- Identifies symptoms correctly
- Forms reasonable hypothesis
- Finds relevant code
- Explains basic problem

**Strong (High Pass):**
- Systematic investigation through all tools
- Identifies exact bug location(s)
- Proposes specific fixes
- Discusses architectural improvements

**Exceptional:**
- Efficient investigation (<10 minutes)
- Finds multiple contributing factors
- Comprehensive solution with trade-offs
- Discusses prevention and monitoring

---

## Code Quality Notes

This is realistic production code with:
- ✅ Proper TypeScript typing
- ✅ Error handling
- ✅ Logging and metrics
- ✅ Configuration management
- ✅ Layered architecture
- ⚠️ Intentional bugs for debugging scenarios

The bugs are realistic issues that could occur in production systems due to:
- Missing edge case handling
- Architectural anti-patterns
- Performance oversight
- Concurrency issues

---

## Technology Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 20+
- **Database**: PostgreSQL (simulated)
- **Cache**: Redis (simulated)
- **API**: Express.js
- **Logging**: Structured JSON
- **Metrics**: Custom collector (Prometheus-style)

---

## License

This code is for interview purposes only. Not for production use.
