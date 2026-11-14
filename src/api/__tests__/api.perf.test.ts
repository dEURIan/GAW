import http, { type Server } from 'node:http';
import { performance } from 'node:perf_hooks';
import { duplexPair } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../db/database.js';
import { createApp } from '../app.js';

function percentile(sorted: number[], pct: number): number {
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((pct / 100) * sorted.length) - 1,
  );
  return sorted[idx];
}

function sendHttp(
  server: Server,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const [clientSock, serverSock] = duplexPair();
    server.emit('connection', serverSock);

    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = { Connection: 'close' };
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      { createConnection: () => clientSock, method, path, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          clientSock.destroy();
          serverSock.destroy();
          resolve({
            status: res.statusCode ?? 0,
            data: JSON.parse(Buffer.concat(chunks).toString('utf8')),
          });
        });
      },
    );

    req.on('error', (err) => {
      clientSock.destroy();
      serverSock.destroy();
      reject(err);
    });

    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

describe('GAW API Performance Budgets', () => {
  it('meets p95 <= 200ms, p99 <= 500ms, and error rate < 1% across core endpoints', async () => {
    const db = createDatabase();
    const server = http.createServer(createApp(db));

    try {
      const empRes = await sendHttp(server, 'POST', '/api/v1/users', {
        name: 'Perf Employer',
        role: 'employer',
        tier: 'PRO',
        barangay: 'Poblacion',
        lat: 7.0644,
        lng: 125.608,
      });
      const employer = empRes.data as { id: string };

      for (let i = 0; i < 20; i++) {
        await sendHttp(server, 'POST', '/api/v1/gigs', {
          employerId: employer.id,
          title: `Gig ${i}`,
          description: 'Proximity benchmark gig',
          category: 'delivery',
          estimatedHours: 4,
          offeredPricePhp: 320,
          barangay: 'Poblacion',
          lat: 7.0644 + i * 0.001,
          lng: 125.608 + i * 0.001,
        });
      }

      const durationsMs: number[] = [];
      let failures = 0;
      const iterations = 120;

      for (let i = 0; i < iterations; i++) {
        const mode = i % 3;
        const start = performance.now();
        let res: { status: number; data: unknown };
        if (mode === 0) {
          res = await sendHttp(server, 'GET', '/api/v1/health');
        } else if (mode === 1) {
          res = await sendHttp(
            server,
            'GET',
            '/api/v1/gigs/nearby?lat=7.0644&lng=125.608&radiusKm=10',
          );
        } else {
          res = await sendHttp(server, 'POST', '/api/v1/pricing/estimate', {
            category: 'cleaning',
            estimatedHours: 4,
            urgency: 'standard',
            requiredSkills: ['sweeping'],
          });
        }
        const elapsed = performance.now() - start;
        durationsMs.push(elapsed);
        if (res.status < 200 || res.status >= 300) {
          failures += 1;
        }
      }

      const sorted = [...durationsMs].sort((a, b) => a - b);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);
      const errorRate = failures / iterations;

      expect(errorRate).toBeLessThan(0.01);
      expect(p95).toBeLessThanOrEqual(200);
      expect(p99).toBeLessThanOrEqual(500);
    } finally {
      server.close();
      db.close();
    }
  });
});
