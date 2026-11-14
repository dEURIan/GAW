import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { duplexPair } from 'node:stream';
import { createDatabase } from '../dist/db/database.js';
import { createApp } from '../dist/api/app.js';

function percentile(sorted, pct) {
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((pct / 100) * sorted.length) - 1,
  );
  return sorted[idx];
}

function sendHttp(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const [clientSock, serverSock] = duplexPair();
    server.emit('connection', serverSock);

    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers = { Connection: 'close' };
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      { createConnection: () => clientSock, method, path, headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
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

async function main() {
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
    const employer = empRes.data;

    for (let i = 0; i < 20; i++) {
      await sendHttp(server, 'POST', '/api/v1/gigs', {
        employerId: employer.id,
        title: `Perf Gig ${i}`,
        description: 'Davao benchmark gig',
        category: 'delivery',
        estimatedHours: 4,
        offeredPricePhp: 320,
        barangay: 'Poblacion',
        lat: 7.0644 + i * 0.001,
        lng: 125.608 + i * 0.001,
      });
    }

    const totalRequests = 150;
    const durationsMs = [];
    let failures = 0;

    for (let i = 0; i < totalRequests; i++) {
      const mode = i % 3;
      const start = performance.now();
      let res;
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
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);
    const errorRate = failures / totalRequests;

    console.log(
      `API Perf Gate (${totalRequests} reqs): p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms p99=${p99.toFixed(2)}ms errorRate=${(errorRate * 100).toFixed(2)}%`,
    );

    if (p95 > 200 || p99 > 500 || errorRate >= 0.01) {
      console.error('API performance budget exceeded!');
      process.exitCode = 1;
    }
  } finally {
    server.close();
    db.close();
  }
}

await main();
