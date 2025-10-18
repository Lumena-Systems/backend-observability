# Scenario 1: Thundering Herd on Background Job Scheduling

## Problem Description for Candidate

**Title:** System Unresponsiveness - Hourly Pattern

**Reported Symptoms:**
"The entire platform becomes unresponsive every hour on the hour. API requests time out, users see 'Service Unavailable' errors, and workflows fail to start. This happens consistently at 12:00, 13:00, 14:00, etc., lasting 2-3 minutes each time. The issue started this morning at 08:00 and has repeated every hour since. No deployments or configuration changes occurred today."

**Business Impact:**
- Users experiencing 503 errors during the outage windows
- Workflows queued during these periods fail or are delayed
- Customer support receiving complaints about predictable downtime
- Dashboard shows service degradation for 2-3 minutes every hour

---

## Root Cause

### Architecture Issue
Background job scheduler rounds all "schedule for next hour" jobs to exactly :00 minutes with zero jitter. When 5,000+ scheduled jobs all execute simultaneously, they exhaust the database connection pool and CPU, causing cascading failures across all services.

### Bug Locations

**File: `src/services/job-scheduler/scheduler.ts`**
- **Line ~70-95**: `roundToNextHour()` function
- **Bug**: Strips minutes/seconds and always rounds to next whole hour
- **Effect**: All jobs scheduled between X:01 and X:59 round to (X+1):00:00

**File: `src/services/job-scheduler/job-queue.ts`**
- **Line ~78-100**: `processReadyJobs()` method
- **Bug 1**: Uses `findMany()` with no `LIMIT` clause - fetches ALL ready jobs
- **Bug 2**: Uses `Promise.all()` to start all jobs simultaneously
- **Effect**: At :00, starts 5,000 jobs at once, each holding a database connection

---

## Expected Investigation Path (6 Steps)

### Step 1: Recognize the Pattern (2-3 minutes)
- Candidate opens Metrics Dashboard
- Observes API P99 latency chart over time
- **Key insight:** Exact 1-hour periodicity - spikes at 12:00, 13:00, 14:00
- **Expected observation:** "This is happening every hour on the hour - that's too precise to be random. Something is scheduled or triggered at these exact times."

### Step 2: Identify Resource Exhaustion (2-3 minutes)
- Candidate checks Database CPU, Connection Pool metrics
- **Key insight:** Database CPU at 95%, connections maxed out at 200/200
- **Expected observation:** "The database is being overwhelmed. CPU spikes and connection pool hits 100%. But query performance is fine, so it's not a slow query - it's volume."

### Step 3: Correlate with Background Jobs (3-4 minutes)
- Candidate looks for what's causing the database load
- Finds "background_jobs_executing" metric showing 5,000+ jobs at :00
- Views "job_queue_depth" showing 5,000 jobs ready at :58
- **Expected observation:** "There are 5,000 background jobs all starting simultaneously at :00. That's creating a thundering herd that exhausts the connection pool."

### Step 4: Examine Job Execution Traces (2-3 minutes)
- Filters traces to 12:00-12:03 (during spike)
- Sees thousands of job execution traces clustered at :00:00 to :00:05
- **Expected observation:** "The jobs are simple and fast - each takes 100-200ms. But 5,000 running simultaneously hold all 200 connections, blocking everything else."

### Step 5: Investigate Job Scheduling Logic (3-5 minutes)
- Searches logs for job scheduling patterns
- Filters to time before spike (11:55-11:59)
- Finds logs showing `next_run_at` ALL rounded to :00:00
- **Expected observation:** "All jobs have next_run_at rounded to exact hour with zero seconds. No jitter or randomization. That's why they execute simultaneously."

### Step 6: Find the Buggy Code (4-6 minutes)
- Opens `src/services/job-scheduler/scheduler.ts`
- Finds `roundToNextHour()` that strips minutes/seconds
- Opens `src/services/job-scheduler/job-queue.ts`
- Finds `processReadyJobs()` with no `LIMIT` and `Promise.all()`
- **Expected observation:** "The scheduler rounds all times to next hour without jitter. The queue processor grabs ALL ready jobs with no batching or rate limiting."

---

## What Qualifies as "Solved"

### Minimum (Pass):
- Identifies the hourly pattern
- Recognizes job execution spike causes database exhaustion
- Explains thundering herd problem
- Points to scheduler or job queue as the issue

### Strong (High Pass):
- Follows systematic investigation path through all 6 steps
- Identifies both code issues (rounding + no batching)
- Proposes specific mitigations (jitter, batching, rate limiting)
- Discusses architectural improvements

### Exceptional:
- Quickly identifies pattern and forms hypothesis
- Efficiently navigates tools to validate
- Finds buggy code in <5 minutes
- Proposes comprehensive solution
- Discusses prevention (chaos engineering, load testing)

---

## Mitigation Discussion

### Immediate Fixes:
```typescript
// Fix 1: Add jitter to scheduled times
private roundToNextHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(0);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  
  if (date.getMinutes() > 0 || date.getSeconds() > 0) {
    rounded.setHours(rounded.getHours() + 1);
  }
  
  // Add jitter: ±15 minutes
  const jitterMs = (Math.random() - 0.5) * 30 * 60 * 1000;
  return new Date(rounded.getTime() + jitterMs);
}

// Fix 2: Batch job processing
private async processReadyJobs(): Promise<void> {
  const BATCH_SIZE = 50;
  const readyJobs = await db.scheduledJob.findMany({
    where: {
      nextRunAt: { lte: new Date() },
      status: 'scheduled',
    },
    take: BATCH_SIZE, // Limit batch size
  });
  
  // Process jobs sequentially in batches, not all at once
  for (const job of readyJobs) {
    await this.executeJob(job);
  }
}
```

### Better Solutions:
- Separate connection pool for background jobs
- Dedicated worker infrastructure (separate from API servers)
- Job priority queues (critical jobs first)
- Exponential backoff for retries
- Circuit breaker if queue depth exceeds threshold

### Prevention:
- Monitor job queue depth and alert on >1000 ready jobs
- Load testing with realistic job schedules
- Chaos testing: simulate job spikes
- Dashboard showing job execution distribution over time
- Alerts on connection pool utilization >80%

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
│       ├── validation-service.ts
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
│       ├── users/
│       ├── data/
│       └── reports/
└── services/                     # Backend services
    ├── job-scheduler/            ⚠️ CONTAINS BUG #1 & #2
    │   ├── scheduler.ts          ← Bug: roundToNextHour() 
    │   ├── job-queue.ts          ← Bug: no LIMIT in processReadyJobs()
    │   ├── job-executor.ts
    │   └── job-types/
    │       ├── data-sync.ts
    │       ├── email-sender.ts
    │       ├── report-generator.ts
    │       └── cleanup.ts
    ├── workflow-engine/
    │   ├── executor.ts
    │   ├── state-manager.ts
    │   ├── step-runner.ts
    │   └── validators.ts
    ├── workflow-service/
    │   ├── executor.ts
    │   ├── state-manager.ts
    │   ├── step-processor.ts
    │   └── validator.ts
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
- API P99 latency: normal 120-180ms, spikes to 12,500ms
- Database CPU: normal 25-35%, spikes to 95%+
- Database connections: normal 45-65, spikes to 195-200
- Background jobs executing: normal 15-25, spikes to 5,000+
- Job queue depth: 5,000 ready at :58, drops to 0 at :03

### Traces (10,000+):
- 85% normal operations (80-300ms)
- 8% slow during spike (5-15 seconds)
- 5% timeout failures
- 2% job traces (showing simultaneous execution)

### Logs (15,000+):
- 80% routine operations
- 5% job scheduling (showing rounded timestamps)
- 5% job execution (clustered at :00)
- 3% connection pool warnings
- 2% API timeout errors

### Database Analyzer:
- Hundreds of concurrent simple queries
- Connection pool at 100% utilization
- Individual queries fast but overwhelming volume

### Service Graph:
- Job Scheduler → Database: 5,000 req/sec spike at :00
- All services degraded during spike

