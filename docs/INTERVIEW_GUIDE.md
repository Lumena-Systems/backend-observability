# Production Debugging Interview Guide

## Overview

This is a 60-minute production debugging interview with three scenarios. Candidates use the observability platform to investigate real-world bugs. No local code execution required.

## Setup Instructions

### Before the Interview (24 hours prior)

1. **Deploy Observability Platform**:
   ```bash
   cd observability-platform
   npm install
   npm run build
   # Deploy to Vercel or similar
   ```

2. **Send to Candidate**:
   ```
   Hi [Name],
   
   For tomorrow's interview, you'll be debugging production issues using our 
   observability platform. No code setup needed - everything runs in the browser.
   
   Platform URL: https://observability.vercel.app
   
   Please verify you can access it and that the dashboard loads. You'll see three 
   scenarios - don't worry about solving them yet, we'll do that together.
   
   The interview will be 60 minutes total with three 18-minute debugging sessions.
   
   See you tomorrow!
   ```

3. **Interviewer Prep**:
   - Review solution docs for each scenario
   - Have scoring rubric ready
   - Prepare hints in case candidate gets stuck
   - Set up screen sharing

## Interview Flow (60 minutes)

### Introduction (5 min)

- Introduce yourself and the interview format
- Explain: "You'll debug three production issues using our observability tools"
- Show the dashboard: "Three scenarios, each has symptoms reported by users"
- Walk through available tools (2 min):
  - **Metrics Dashboard**: time-series graphs
  - **Traces**: distributed tracing with flame graphs
  - **Logs**: structured log search
  - **Database Analyzer**: query performance, locks
  - **Heap Dumps**: memory analysis (scenario 3)
  - **Service Graph**: service dependencies
- Ask: "Any questions about the tools?"
- Set expectations: "~18 minutes per scenario, it's okay if you don't fully solve one"

### Scenario 1: Webhook Retry Storm (18 min)

**Start**: "Let's start with scenario 1. Users report webhook deliveries are failing 
and the system is extremely slow. This started 15 minutes ago. What's your 
approach to debugging this?"

#### Watch for:
- Do they start systematically or randomly click?
- Do they read the symptom description first?
- What tool do they check first?

#### Expected debugging path:
1. Check metrics → see exponential growth in outbound requests
2. Look at error rate → spiking
3. Check traces → see retry_count increasing
4. Look at logs → see same webhook_id with multiple attempts
5. Identify: webhook endpoint is down, retry logic creates exponential growth

#### Hints if stuck (provide after specified time):
- **3 min**: "What metrics would you expect to see if there's a retry problem?"
- **6 min**: "Look at the outbound HTTP requests metric over time"
- **9 min**: "Check the traces - look at the retry_count tag"
- **12 min**: "What happens when one webhook fails and schedules 5 retries, then those 5 fail?"

#### Discussion points (last 3 min):
- "What's causing this?"
- "How would you fix it?"
- "What about circuit breakers vs rate limiting?"
- "How would you prevent this architecturally?"

### Scenario 2: JSON Parsing Performance (18 min)

**Start**: "Scenario 2. Users report workflows running extremely slowly. One customer's 
workflows are taking 10+ minutes when they used to take seconds. How would you 
investigate?"

#### Expected debugging path:
1. Check metrics → see latency spike for specific customer
2. Look at traces → see JSON.parse taking 2-3 seconds per step
3. Check state_size_bytes tag → it's 50MB
4. Realize: parsing 50MB JSON on every step
5. Count steps → 20 steps × 2.5s parsing = 50s overhead

#### Hints if stuck:
- **3 min**: "Compare a slow trace to a normal one - what's different?"
- **6 min**: "Look at the span timings in the traces"
- **9 min**: "What's the state_size_bytes tag showing?"
- **12 min**: "How many times is JSON.parse called per workflow?"

#### Discussion points:
- "Why is it so slow?"
- "How would you optimize this?"
- "Parse once vs streaming vs different storage?"
- "What limits would you add?"

### Scenario 3: Memory Leak (18 min)

**Start**: "Scenario 3. The workflow service keeps crashing every 4-6 hours with out 
of memory errors. Some workflows don't complete. What's your debugging approach?"

#### Expected debugging path:
1. Check metrics → see memory climbing steadily
2. Look at GC metrics → frequent GC, not freeing much
3. Check heap dumps → compare snapshots
4. Notice: Function count growing, EventEmitter retaining huge amount
5. Look at retention paths → event handlers not being removed
6. Check traces → registerEventHandlers but no removeEventHandlers

#### Hints if stuck:
- **3 min**: "Look at the memory metric over time - what pattern do you see?"
- **6 min**: "Compare the heap snapshots from different times"
- **9 min**: "What type of objects are growing? Look at the retention paths"
- **12 min**: "See the EventEmitter warning in the logs?"
- **15 min**: "Event handlers are registered but never removed"

#### Discussion points:
- "What's causing the leak?"
- "How do closures contribute to this?"
- "How would you fix it?"
- "What patterns prevent this class of leak?"
- "How would you detect this in production?"

### Wrap-up (6 min)

- Ask: "Which scenario was most interesting to you?"
- Discuss: "How would you design an observability strategy for a startup?"
- Thank candidate and explain next steps

## Scoring (Complete After Interview)

Use the scoring rubric below. For each scenario, score 0-3:

- **3 points**: Identified root cause with minimal hints, proposed comprehensive solution
- **2 points**: Identified with one hint, proposed working solution
- **1 point**: Required significant guidance, understood after explanation
- **0 points**: Could not identify even with hints

### Pass Threshold
- **Pass**: 6-7 points (average of 2 per scenario)
- **Strong Pass**: 8-9 points

### Evaluation Criteria

#### Systematic Approach (Weight: 30%)
- Do they form hypotheses before investigating?
- Do they follow a logical debugging flow?
- Do they document their findings as they go?

#### Tool Usage (Weight: 25%)
- Can they navigate the observability tools effectively?
- Do they know when to use each tool?
- Can they filter and search efficiently?

#### Data Correlation (Weight: 25%)
- Can they connect data across different tools?
- Do they notice patterns and anomalies?
- Can they correlate timing across metrics, logs, and traces?

#### Root Cause Analysis (Weight: 15%)
- Do they identify the actual bug vs symptoms?
- Can they explain WHY the bug causes the symptoms?
- Do they understand the underlying mechanisms?

#### Solution Design (Weight: 5%)
- Can they propose comprehensive fixes?
- Do they consider production implications?
- Can they discuss tradeoffs between solutions?

## Common Red Flags

- Random clicking without hypothesis
- Doesn't read symptoms carefully
- Ignores obvious signals (exponential curves, huge numbers)
- Can't correlate data across tools
- Blames the tools rather than investigating
- Doesn't understand fundamental concepts (closures, event loop, exponential growth)
- Proposes solutions that address symptoms not root cause
- No systematic methodology

## Common Green Flags

- Systematic approach ("Let me check X, then Y")
- Forms hypotheses ("I think it might be...")
- Correlates data ("The spike here matches this event")
- Asks clarifying questions
- Discusses tradeoffs between solutions
- Thinks about prevention, not just fixes
- Understands production implications
- Good communication throughout
- Takes notes and stays organized

## Handling Different Candidate Levels

### Junior Candidates
- Expect them to struggle with Scenario 3
- Look for learning ability and asking good questions
- Strong performance on Scenarios 1 and 2 is good
- Focus on systematic approach over speed

### Mid-Level Candidates
- Should solve at least 2 scenarios with minimal hints
- Should understand concepts well
- Look for production thinking
- Should propose reasonable solutions

### Senior Candidates
- Should solve all 3 scenarios
- Should require minimal hints
- Look for architectural thinking
- Should discuss prevention and monitoring
- Should understand tradeoffs deeply

### Staff+ Candidates
- Should solve all 3 quickly
- Should go beyond the immediate fix
- Should discuss system design implications
- Should propose comprehensive monitoring strategies
- Should think about organizational/process improvements

## Tips for Interviewers

1. **Don't give away the answer**: Let them struggle a bit. Learning happens at the edge of comfort.

2. **Progressive hints**: Start vague, get more specific only if needed.

3. **Encourage thinking aloud**: "Talk me through your thought process"

4. **Pause before hinting**: Give them 30 seconds of silence to think.

5. **Note taking**: Take notes on their approach, not just whether they got it right.

6. **Be encouraging**: "Good observation" or "Interesting approach" keeps morale up.

7. **Time management**: Keep track of time, gently move them along if stuck.

8. **Discussion matters**: The wrap-up discussion is as important as the debugging.

## Common Questions from Candidates

**Q: Can I look at the code?**
A: The observability platform is all you need. In production, you wouldn't have immediate code access either.

**Q: Is this data real?**
A: It's based on real production issues we've seen, with realistic data patterns.

**Q: What if I can't solve one?**
A: That's okay! We're evaluating your approach and thinking, not just the answer.

**Q: Can I use external resources?**
A: This is a conversation, not a test. If you want to Google something, that's fine.

## After the Interview

1. **Complete scoring rubric** within 24 hours
2. **Write feedback notes** (2-3 paragraphs minimum)
3. **Share with hiring committee**
4. **Debrief with other interviewers** if part of panel

## Calibration Notes

To maintain consistency:
- Review the solution docs before each interview
- Discuss edge cases with other interviewers
- Calibrate scoring with the team quarterly
- Share interesting candidate approaches in team meetings


