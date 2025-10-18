# Observability Platform - Production Debugging Interview

A web-based observability platform for debugging production issues in a coding interview setting. Candidates investigate two realistic scenarios using various debugging tools.

## Features

- **Scenario 1: Webhook Retry Storm** - Debug exponential retry growth causing system overload
- **Scenario 2: JSON Parsing Performance** - Identify performance bottlenecks in workflow execution

## Tools Included

- 📊 **Metrics Dashboard** - Time-series charts for system metrics
- 🔍 **Distributed Traces** - Request flow visualization with flame graphs
- 📝 **Logs Explorer** - Structured log search and filtering
- 💾 **Database Analyzer** - Query performance and lock analysis
- 🧠 **Memory Profiler** - Heap dumps and GC metrics
- 🌐 **Service Graph** - Service dependencies and health visualization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the platform.

### Building for Production

```bash
npm run build
npm run start
# or
yarn build
yarn start
```

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/observability-platform)

1. Click the "Deploy to Vercel" button above
2. Connect your GitHub account
3. Vercel will automatically build and deploy
4. Share the URL with interview candidates

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy the .next folder to your hosting provider
# The app is a static/serverless Next.js application
```

## Project Structure

```
observability-platform/
├── app/                      # Next.js 14 App Router pages
│   ├── page.tsx             # Home page with scenario selector
│   ├── scenario-1/          # Webhook Retry Storm
│   └── scenario-2/          # JSON Parsing Performance
├── components/
│   ├── ScenarioLayout.tsx   # Shared layout for scenarios
│   └── tools/               # Observability tool components
│       ├── MetricsChart.tsx
│       ├── TraceViewer.tsx
│       ├── LogViewer.tsx
│       ├── DatabaseAnalyzer.tsx
│       └── ServiceGraph.tsx
├── data/                    # Pre-generated observability data
│   ├── scenario-1/
│   └── scenario-2/
└── lib/                     # Utilities and types
```

## For Interviewers

### Interview Flow

1. Send the deployed URL to candidates 24 hours before the interview
2. During the interview (45 minutes):
   - Introduction (5 min)
   - Scenario 1 (18 min)
   - Scenario 2 (18 min)
   - Wrap-up discussion (9 min)

### Evaluation Criteria

- **Systematic Approach**: Do they have a debugging methodology?
- **Tool Usage**: Can they effectively use observability tools?
- **Correlation**: Can they connect data across different tools?
- **Root Cause Analysis**: Do they identify the actual bug vs symptoms?
- **Solution Design**: Can they propose comprehensive fixes?

See the `interview-app` repository for detailed solutions and interviewer guides.

## Data Generation

All observability data is pre-generated and stored in JSON files in the `data/` directory. This ensures:

- Consistent interview experience
- No need for running backend services
- Fast loading times
- Easy deployment

## Customization

### Adding New Scenarios

1. Create a new directory in `app/scenario-X/`
2. Add data files in `data/scenario-X/`
3. Create a page component using `ScenarioLayout`
4. Update the home page to include the new scenario

### Modifying Data

Edit the JSON files in `data/scenario-X/` to adjust:
- Metric values and trends
- Trace timings and tags
- Log messages and frequencies
- Heap dump snapshots

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## License

MIT License - feel free to use this for your own interviews!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Questions?

For questions about using this in interviews, see the `interview-app` repository or open an issue.


