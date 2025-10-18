import { createLogger } from './logger';

const logger = createLogger('metrics');

interface MetricLabels {
  [key: string]: string | number;
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  counter(name: string, value: number = 1, labels?: MetricLabels) {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  gauge(name: string, value: number, labels?: MetricLabels) {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  histogram(name: string, value: number, labels?: MetricLabels) {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  timing(name: string, durationMs: number, labels?: MetricLabels) {
    this.histogram(`${name}_duration_ms`, durationMs, labels);
  }

  private buildKey(name: string, labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  export(): Record<string, any> {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            min: Math.min(...values),
            max: Math.max(...values),
            p50: this.percentile(values, 50),
            p95: this.percentile(values, 95),
            p99: this.percentile(values, 99),
          },
        ])
      ),
    };
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

const metrics = new MetricsCollector();

export default metrics;

export async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: MetricLabels
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    metrics.timing(name, duration, labels);
    metrics.counter(`${name}_success`, 1, labels);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.timing(name, duration, labels);
    metrics.counter(`${name}_error`, 1, labels);
    throw error;
  }
}

