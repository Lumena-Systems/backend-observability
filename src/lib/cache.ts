import { createLogger } from './logger';
import config from './config';
import metrics from './metrics';

const logger = createLogger('cache');

interface CacheEntry {
  value: any;
  expiresAt: number;
}

class CacheClient {
  private store: Map<string, CacheEntry> = new Map();
  private connected: boolean = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    logger.info('Connecting to cache', {
      host: config.cache.host,
      port: config.cache.port,
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
    
    logger.info('Cache connected');
    
    setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<any | null> {
    const startTime = Date.now();
    
    if (!this.connected) {
      throw new Error('Cache not connected');
    }

    const entry = this.store.get(key);
    const duration = Date.now() - startTime;
    
    if (!entry || entry.expiresAt < Date.now()) {
      metrics.counter('cache_miss');
      metrics.histogram('cache_get_duration_ms', duration);
      return null;
    }

    metrics.counter('cache_hit');
    metrics.histogram('cache_get_duration_ms', duration);
    
    return entry.value;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const startTime = Date.now();
    
    if (!this.connected) {
      throw new Error('Cache not connected');
    }

    const ttl = ttlSeconds || config.cache.ttl;
    const expiresAt = Date.now() + (ttl * 1000);

    this.store.set(key, { value, expiresAt });
    
    const duration = Date.now() - startTime;
    metrics.histogram('cache_set_duration_ms', duration);
    metrics.counter('cache_set');
  }

  async del(key: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Cache not connected');
    }

    this.store.delete(key);
    metrics.counter('cache_delete');
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Cache not connected');
    }

    const entry = this.store.get(key);
    return entry !== undefined && entry.expiresAt >= Date.now();
  }

  private cleanup() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      metrics.counter('cache_expired_keys', expiredCount);
    }
    
    metrics.gauge('cache_size', this.store.size);
  }

  getStats() {
    return {
      connected: this.connected,
      size: this.store.size,
    };
  }
}

const cache = new CacheClient();

export default cache;

