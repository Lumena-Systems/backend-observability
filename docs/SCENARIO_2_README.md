# Scenario 2: Connection Pool Exhaustion from Long-Running Transactions

## Problem Description for Candidate

**Title:** API Timeout Cascade - Database Connection Pool Exhausted

**Reported Symptoms:**
"Multiple API endpoints are timing out. Users see 'Request timeout' or 'Database unavailable' errors. Started 30 minutes ago during normal business hours. Database monitoring shows CPU and disk are normal, individual queries are fast. Connection pool shows 100% utilization. No deployments, infrastructure changes, or traffic spikes occurred."

**Business Impact:**
- 35% error rate across API endpoints
- Workflows failing to start or complete
- Users unable to access dashboard or execute operations
- Support team overwhelmed with timeout reports

---

## Root Cause

### Architecture Issue
The `POST /api/workflows/import` endpoint holds database transactions open while making external API calls to validate workflow definitions. The external validation service takes 20-25 seconds to respond. Each import holds a database connection for the entire duration, during which the connection is "idle in transaction" and unavailable for other requests.

With 15-20 concurrent imports, this holds 15-20 connections for 20-25 seconds each, exhausting the connection pool (200 total) and causing all other API requests to timeout.

### Bug Locations

**File: `src/api/routes/workflows/import.ts`**
- **Lines ~40-121**: Entire import wrapped in `db.$transaction()`
- **Lines ~83-103**: External API call `validateWithExternalService()` inside transaction
- **Bug**: Transaction begins, inserts data, then calls external service (20-25 seconds), then updates status, then commits
- **Effect**: Holds database connection for 20-25+ seconds doing nothing during external API call

**File: `src/services/workflow-service/validator.ts`**
- **Lines ~20-56**: `validateWithExternalService()` function
- **Not a bug itself**, but calls slow external API (20-25 seconds)
- **Effect**: When called from within transaction, exposes the connection-holding bug

---

## Expected Investigation Path (6 Steps)

### Step 1: Rule Out Database Performance Issues (2-3 minutes)
- Candidate opens Metrics Dashboard
- Checks Database CPU → Normal (30-40%)
- Checks query latency → Normal (queries completing in <50ms)
- **Key insight:** Database itself is healthy, but API is timing out
- **Expected observation:** "The database looks fine - CPU is normal, queries are fast. But the API is timing out. This isn't a database performance problem."

### Step 2: Identify Connection Pool Exhaustion (2-3 minutes)
- Checks connection pool metrics
- Views "database_connection_pool_utilization" → 98-100%
- Views "database_active_connections" → 200/200 (maxed out)
- Views "connection_pool_queue_depth" → 85 requests waiting
- **Expected observation:** "The connection pool is completely exhausted. All 200 connections are in use, and there's a queue of 85 requests waiting."

### Step 3: Analyze Connection State (3-4 minutes)
- Opens Database Analyzer
- Views active connections table
- **Key insight:** Most connections show state "idle in transaction" not "active"
- **Expected observation:** "The connections aren't actively querying - they're 'idle in transaction'. Something is holding transactions open while not using the database."

### Step 4: Find Long-Running Transactions (3-4 minutes)
- Examines long-running transactions in Database Analyzer
- Clicks on a transaction to see query history
- **Key insight:** Pattern shows: BEGIN → INSERT (fast) → 20-25s gap → UPDATE (fast) → COMMIT
- **Expected observation:** "These transactions have a huge gap between INSERT and UPDATE where nothing is happening in the database. They're holding the connection but not using it."

### Step 5: Correlate with External API Calls (2-3 minutes)
- Checks "external_api_call_latency" metric → 20-25 seconds to validation service
- Views Service Graph → API → External Validation Service with high latency
- Filters traces to show requests that hit external validation
- **Expected observation:** "There are calls to an external validation service taking 20-25 seconds. That matches the gap in the transactions."

### Step 6: Identify the Problematic Endpoint and Code (4-6 minutes)
- Filters traces to find which endpoint makes these calls
- Finds "POST /api/workflows/import" with traces showing transaction → external call pattern
- Opens `src/api/routes/workflows/import.ts`
- **Key insights:**
  - `db.$transaction()` wrapper around entire import logic
  - `validateWithExternalService()` called inside transaction
  - Transaction timeout set to 60 seconds (allows this to happen)
- **Expected observation:** "The /workflows/import endpoint wraps everything in a database transaction, including a call to an external validation service that takes 20-25 seconds. The database connection is held open doing nothing during that entire time."

---

## What Qualifies as "Solved"

### Minimum (Pass):
- Identifies connection pool exhaustion
- Recognizes connections are "idle in transaction"
- Links to external API call delay
- Explains holding connections during I/O is the problem

### Strong (High Pass):
- Follows systematic path through all 6 steps
- Identifies specific endpoint (`/workflows/import`)
- Finds buggy code wrapping external call in transaction
- Proposes transaction restructuring or saga pattern

### Exceptional:
- Quickly rules out database performance issues
- Efficiently navigates from metrics → traces → database → code
- Finds problematic code in <5 minutes
- Proposes comprehensive solution including connection pool monitoring
- Discusses transaction design patterns and best practices

---

## Mitigation Discussion

### Immediate Fix:
```typescript
// BEFORE (BUGGY):
const workflow = await db.$transaction(async (tx) => {
  const workflow = await tx.workflow.create({ ... });
  await tx.workflowStep.createMany({ ... });
  
  // BUG: External API call inside transaction
  const validationResult = await validateWithExternalService(workflow);
  
  await tx.workflow.update({ ... });
  return workflow;
});

// AFTER (FIXED):
// Step 1: Insert workflow in transaction (commit immediately)
const workflow = await db.$transaction(async (tx) => {
  const workflow = await tx.workflow.create({ ... });
  await tx.workflowStep.createMany({ ... });
  return workflow;
});
// Transaction commits here, connection released

// Step 2: Call external validation (no transaction)
const validationResult = await validateWithExternalService(workflow);

// Step 3: Update status in new transaction
if (validationResult.valid) {
  await db.workflow.update({
    where: { id: workflow.id },
    data: { status: 'active', validatedAt: new Date() }
  });
} else {
  // Compensating transaction - mark as invalid
  await db.workflow.update({
    where: { id: workflow.id },
    data: { status: 'invalid' }
  });
}
```

### Better Solutions:
- **Saga pattern**: Series of local transactions with compensating transactions
- **Async validation**: Import completes immediately, validation happens via webhook callback
- **Queue-based**: Import to queue, worker processes with validation, updates status
- **Separate connection pool**: Dedicated pool for long-running operations

### Architectural Improvements:
- **Never do I/O inside transactions**: No network calls, no file system operations
- **Transaction timeout**: Set aggressive timeout (5-10s max)
- **Monitor "idle in transaction" time**: Alert if >1 second
- **Rate limit import endpoint**: Max 5-10 concurrent imports
- **Circuit breaker on external service**: Fast-fail when validation service is slow
- **Connection pool monitoring**: Alert at 80% utilization

### Prevention:
- **Linting rule**: No external calls inside transactions
- **Code review checklist**: Transaction boundaries reviewed
- **Load testing**: Realistic concurrency testing
- **Observability**: Monitor connection pool and alert early
- **Architecture principle**: I/O and transactions never mix

---

## Code Structure

The application is a unified codebase containing all services and APIs:

```
interview-app/src/
├── lib/                          # Infrastructure
│   ├── config.ts
│   ├── logger.ts
│   ├── metrics.ts
│   ├── cache.ts
│   ├── database/
│   │   ├── client.ts
│   │   ├── migrations.ts
│   │   └── transactions.ts
│   └── external-apis/
│       ├── validation-service.ts  ← Slow service (20-25s)
│       ├── payment-gateway.ts
│       └── email-provider.ts
├── types/                        # Type definitions
│   ├── api.ts
│   ├── job.ts
│   ├── workflow.ts
│   └── user.ts
├── api/                          # REST API
│   ├── server.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── error-handler.ts
│   │   └── request-logging.ts
│   └── routes/
│       ├── health.ts
│       ├── workflows/
│       │   ├── create.ts
│       │   ├── execute.ts
│       │   ├── import.ts         ⚠️ CONTAINS BUG (lines 83-103)
│       │   ├── export.ts
│       │   └── status.ts
│       ├── users/
│       │   ├── create.ts
│       │   ├── update.ts
│       │   └── delete.ts
│       ├── data/
│       │   ├── sync.ts
│       │   └── transform.ts
│       └── reports/
│           ├── generate.ts
│           └── schedule.ts
└── services/                     # Backend services
    ├── job-scheduler/
    │   ├── scheduler.ts
    │   ├── job-queue.ts
    │   ├── job-executor.ts
    │   └── job-types/
    ├── workflow-engine/
    │   ├── executor.ts
    │   ├── state-manager.ts
    │   ├── step-runner.ts
    │   └── validators.ts
    ├── workflow-service/
    │   ├── executor.ts
    │   ├── state-manager.ts
    │   ├── step-processor.ts
    │   └── validator.ts          ← validateWithExternalService()
    ├── notification-service/
    │   ├── email.ts
    │   ├── webhooks.ts
    │   └── in-app.ts
    ├── user-service/
    │   ├── user-manager.ts
    │   ├── permissions.ts
    │   └── authentication.ts
    └── data-service/
        ├── importer.ts
        ├── exporter.ts
        └── transformer.ts
```

---

## Observability Data Requirements

### Metrics:
- API P99 latency: most endpoints 100-200ms → 8,000-15,000ms
- API error rate: 35% (connection timeouts)
- Database CPU: normal 30-40% (NOT the problem)
- Connection pool utilization: 98-100%
- Active connections: 200/200, most "idle in transaction"
- External API latency: 18-25 seconds to validation service

### Traces (12,000+):
- 75% normal successful (80-300ms)
- 20% timeout failures (waiting for DB connection 10+ seconds)
- 3% slow but successful (got connection after long wait)
- 2% import endpoint showing transaction → external call → commit pattern

### Logs (18,000+):
- 75% routine operations
- 15% connection timeout errors
- 3% import operations ("Starting workflow import", "Validating with external service")
- 2% transaction warnings ("Long-running transaction: 25s")
- 3% connection pool warnings
- 2% unrelated noise

### Database Analyzer:
- 200/200 connections, most showing "idle in transaction"
- 15-20 long-running transactions (15-30 seconds each)
- Transaction query history: BEGIN → INSERT (fast) → 25s gap → UPDATE (fast) → COMMIT
- Connection pool queue: 85 requests waiting

### Service Graph:
- API → Database: 200 req/sec, 100% error rate (timeout)
- API → External Validation Service: 18 requests, 22,000ms average latency
- Database node highlighted as "connection pool exhausted"

