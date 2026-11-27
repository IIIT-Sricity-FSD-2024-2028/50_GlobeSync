import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * LogFileService — buffered, interval-based log persistence.
 *
 * Design: all public methods are pure in-memory operations (O(1), no I/O).
 * The setInterval tick is the ONLY place that touches the filesystem, satisfying
 * the "stored at regular intervals" requirement without per-request disk writes.
 *
 * Files written:
 *   back-end/logs/access.log  — HTTP request lines (via LoggerMiddleware)
 *   back-end/logs/error.log   — Exception lines    (via GlobalExceptionFilter)
 *
 * Both files are opened in append mode on each flush, so they accumulate across
 * server restarts without overwriting history.
 */
@Injectable()
export class LogFileService implements OnModuleInit, OnModuleDestroy {
  private readonly logsDir: string;
  private readonly accessLogPath: string;
  private readonly errorLogPath: string;

  private accessBuffer: string[] = [];
  private errorBuffer: string[] = [];

  private intervalRef: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 10_000; // 10 seconds

  constructor() {
    // Resolve relative to the compiled output location:
    // dist/common/services/log-file.service.js  →  ../../..  →  back-end/
    this.logsDir = path.resolve(__dirname, '..', '..', '..', 'logs');
    this.accessLogPath = path.join(this.logsDir, 'access.log');
    this.errorLogPath = path.join(this.logsDir, 'error.log');
  }

  // ---------------------------------------------------------------
  // Lifecycle hooks
  // ---------------------------------------------------------------

  onModuleInit(): void {
    // Ensure the logs/ directory exists before starting the flush interval.
    fs.mkdirSync(this.logsDir, { recursive: true });

    // Schedule periodic flush. No disk I/O happens until the first tick.
    this.intervalRef = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    // Stop the interval so Node's event loop can exit cleanly.
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    // Final flush — drain any buffered entries not yet written.
    this.flush();
  }

  // ---------------------------------------------------------------
  // Public API — pure in-memory; no filesystem access
  // ---------------------------------------------------------------

  /**
   * Buffer one HTTP access log line.
   * Called by LoggerMiddleware on every completed request.
   */
  appendAccessLog(line: string): void {
    this.accessBuffer.push(line);
  }

  /**
   * Buffer one error log line.
   * Called by GlobalExceptionFilter whenever an exception is caught.
   */
  appendErrorLog(line: string): void {
    this.errorBuffer.push(line);
  }

  // ---------------------------------------------------------------
  // Private flush — only place that does disk I/O
  // ---------------------------------------------------------------

  private flush(): void {
    this.drainBuffer(this.accessBuffer, this.accessLogPath);
    this.drainBuffer(this.errorBuffer, this.errorLogPath);
  }

  private drainBuffer(buffer: string[], filePath: string): void {
    if (buffer.length === 0) return;

    // Splice the current contents out so any pushes during the write don't lose entries.
    const lines = buffer.splice(0, buffer.length);
    const content = lines.join('\n') + '\n';

    try {
      fs.appendFileSync(filePath, content, 'utf8');
    } catch (err) {
      // Re-queue entries so they are retried on the next tick rather than silently lost.
      buffer.unshift(...lines);
      console.error('[LogFileService] Failed to write log:', err);
    }
  }
}
