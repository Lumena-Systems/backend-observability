import config from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  metadata?: Record<string, any>;
  traceId?: string;
  transactionId?: string;
}

class Logger {
  private service: string;
  private minLevel: LogLevel;

  constructor(service: string) {
    this.service = service;
    this.minLevel = config.logging.level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      metadata,
    };

    if (config.logging.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.timestamp}] ${level.toUpperCase()} ${this.service}: ${message}`, metadata || '');
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata);
  }
}

export function createLogger(service: string): Logger {
  return new Logger(service);
}

export default Logger;

