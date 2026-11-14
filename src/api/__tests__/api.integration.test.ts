import http, { type Server } from 'node:http';
import { duplexPair } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../../db/database.js';
import { createApp } from '../app.js';

interface ApiTestClient {
  db: DatabaseSync;
  server: Server;
}

function createTestClient(): ApiTestClient {
  const db = createDatabase();
  const app = createApp(db);
  const server = http.createServer(app);
  return { db, server };
}

function closeTestClient(client: ApiTestClient): void {
  client.server.close();
  try {
    client.db.close();
  } catch {
    // Already closed in error-handling tests
  }
}

function sendRawHttp<T = unknown>(
  server: Server,
  method: string,
  path: string,
  rawBody?: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: T }> {
  return new Promise((resolve, reject) => {
    const [clientSock, serverSock] = duplexPair();
    server.emit('connection', serverSock);

    const headers: Record<string, string> = { Connection: 'close' };
    if (rawBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(rawBody));
    }

    const req = http.request(
      {
        createConnection: () => clientSock,
        method,
        path,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          clientSock.destroy();
          serverSock.destroy();
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            data: (text.length > 0 ? JSON.parse(text) : undefined) as T,
          });
        });
      },
    );

    req.on('error', (err) => {
      clientSock.destroy();
      serverSock.destroy();
      reject(err);
    });

    if (rawBody !== undefined) {
      req.write(rawBody);
    }
    req.end();
  });
}

function requestJson<T = unknown>(
  server: Server,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: T }> {
  return sendRawHttp<T>(
    server,
    method,
    path,
    body !== undefined ? JSON.stringify(body) : undefined,
  );
}

const DAVAO_POBLACION = { barangay: 'Poblacion District', lat: 7.0644, lng: 125.608 };
const DAVAO_MATINA = { barangay: 'Matina Crossing', lat: 7.0556, lng: 125.5812 };
const DAVAO_BUHANGIN = { barangay: 'Buhangin Proper', lat: 7.1103, lng: 125.6194 };

describe('GAW API Integration Tests', () => {
  let client: ApiTestClient;

  beforeEach(() => {
    client = createTestClient();
  });

  afterEach(() => {
    closeTestClient(client);
  });

  it('serves health check with security headers and Region XI minimum wage config', async () => {
    const res = await requestJson<{
      status: string;
      dailyMinWagePhp: number;
      hourlyMinWagePhp: number;
    }>(client.server, 'GET', '/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.data.status).toBe('ok');
    expect(res.data.dailyMinWagePhp).toBe(508);
    expect(res.data.hourlyMinWagePhp).toBe(63.5);

    const preflight = await requestJson<undefined>(
      client.server,
      'OPTIONS',
      '/api/v1/health',
    );
    expect(preflight.status).toBe(204);

    const seeded = await requestJson<{
      status: string;
      usersSeeded: number;
      gigsSeeded: number;
    }>(client.server, 'POST', '/api/v1/marketplace/seed');
    expect(seeded.status).toBe(200);
    expect(seeded.data.status).toBe('seeded');
    expect(seeded.data.usersSeeded).toBeGreaterThan(0);
    expect(seeded.data.gigsSeeded).toBeGreaterThan(0);

    const nearbySeeded = await requestJson<{ count: number }>(
      client.server,
      'GET',
      '/api/v1/gigs/nearby?lat=7.0707&lng=125.6087&radiusKm=20',
    );
    expect(nearbySeeded.status).toBe(200);
    expect(nearbySeeded.data.count).toBe(seeded.data.gigsSeeded);
  });

  it('manages user registration, boundaries, profile quotas, and tier upgrades', async () => {
    // Happy path + Unicode name/barangay
    const createEmp = await requestJson<{ id: string; tier: string }>(
      client.server,
      'POST',
      '/api/v1/users',
      {
        name: 'María Clara — Ma-a Bakery',
        role: 'employer',
        barangay: 'Ma-a, Davao City',
        lat: 7.081,
        lng: 125.587,
      },
    );
    expect(createEmp.status).toBe(201);
    expect(createEmp.data.tier).toBe('FREE');

    const empProfile = await requestJson<{
      quota: { maxActiveOpenGigs: number | null; employerFeeRate: number };
    }>(client.server, 'GET', `/api/v1/users/${createEmp.data.id}`);
    expect(empProfile.status).toBe(200);
    expect(empProfile.data.quota.maxActiveOpenGigs).toBe(3);
    expect(empProfile.data.quota.employerFeeRate).toBe(0.05);

    // Upgrade employer to PRO
    const upgrade = await requestJson<{ tier: string }>(
      client.server,
      'PATCH',
      `/api/v1/users/${createEmp.data.id}/subscription`,
      { tier: 'PRO' },
    );
    expect(upgrade.status).toBe(200);
    expect(upgrade.data.tier).toBe('PRO');

    const proProfile = await requestJson<{
      quota: { maxActiveOpenGigs: number | null; employerFeeRate: number };
    }>(client.server, 'GET', `/api/v1/users/${createEmp.data.id}`);
    expect(proProfile.data.quota.maxActiveOpenGigs).toBeNull();
    expect(proProfile.data.quota.employerFeeRate).toBe(0.02);

    // Employee profile quota check
    const createWorker = await requestJson<{ id: string }>(
      client.server,
      'POST',
      '/api/v1/users',
      { name: 'Pedro', role: 'employee', ...DAVAO_POBLACION },
    );
    const workerProfile = await requestJson<{
      quota: { maxSavedGigs: number | null; employeeFeeRate: number };
    }>(client.server, 'GET', `/api/v1/users/${createWorker.data.id}`);
    expect(workerProfile.data.quota.maxSavedGigs).toBe(5);
    expect(workerProfile.data.quota.employeeFeeRate).toBe(0.05);

    // Boundary & error paths
    const outsideDavao = await requestJson<{ error: { code: string } }>(
      client.server,
      'POST',
      '/api/v1/users',
      { name: 'Outside', role: 'employee', barangay: 'Makati', lat: 14.55, lng: 121.02 },
    );
    expect(outsideDavao.status).toBe(422);
    expect(outsideDavao.data.error.code).toBe('OUTSIDE_DAVAO_REGION');

    const invalidPayload = await requestJson<{ error: { code: string } }>(
      client.server,
      'POST',
      '/api/v1/users',
      { name: '', role: 'invalid' },
    );
    expect(invalidPayload.status).toBe(422);
    expect(invalidPayload.data.error.code).toBe('VALIDATION_ERROR');

    const missingGet = await requestJson<{ error: { code: string } }>(
      client.server,
      'GET',
      '/api/v1/users/unknown-id',
    );
    expect(missingGet.status).toBe(404);

    const missingPatch = await requestJson<{ error: { code: string } }>(
      client.server,
      'PATCH',
      '/api/v1/users/unknown-id/subscription',
      { tier: 'PRO' },
    );
    expect(missingPatch.status).toBe(404);

    const invalidPatch = await requestJson<{ error: { code: string } }>(
      client.server,
      'PATCH',
      `/api/v1/users/${createEmp.data.id}/subscription`,
      { tier: 'ENTERPRISE' },
    );
    expect(invalidPatch.status).toBe(422);
  });

  it('enforces Davao minimum wage, supports optional AI pricing, and gates FREE employer gig quotas', async () => {
    const employer = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Kuya Ben Hardware',
        role: 'employer',
        ...DAVAO_POBLACION,
      })
    ).data;
    const worker = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Ate Liza',
        role: 'employee',
        ...DAVAO_POBLACION,
      })
    ).data;

    // AI pricing estimate
    const invalidEstimate = await requestJson(
      client.server,
      'POST',
      '/api/v1/pricing/estimate',
      { category: 'cleaning', estimatedHours: 0 },
    );
    expect(invalidEstimate.status).toBe(422);

    const estimate = await requestJson<{
      minimumWageFloorPhp: number;
      recommendedPhp: number;
    }>(client.server, 'POST', '/api/v1/pricing/estimate', {
      category: 'construction',
      estimatedHours: 4,
      urgency: 'urgent',
      requiredSkills: ['masonry'],
    });
    expect(estimate.status).toBe(200);
    expect(estimate.data.minimumWageFloorPhp).toBe(254);
    expect(estimate.data.recommendedPhp).toBeGreaterThan(254);

    // Reject 1 centavo below Davao prorated minimum wage (4h * 63.50 = 254.00)
    const underpaid = await requestJson<{ error: { code: string } }>(
      client.server,
      'POST',
      '/api/v1/gigs',
      {
        employerId: employer.id,
        title: 'Unload Cement Bags',
        description: 'Move 20 bags at site',
        category: 'construction',
        estimatedHours: 4,
        offeredPricePhp: 253.99,
        ...DAVAO_POBLACION,
      },
    );
    expect(underpaid.status).toBe(422);
    expect(underpaid.data.error.code).toBe('BELOW_MINIMUM_WAGE');

    // Validation, outside-bounds, missing employer, and forbidden role checks
    expect(
      (await requestJson(client.server, 'POST', '/api/v1/gigs', { title: 'x' })).status,
    ).toBe(422);
    expect(
      (
        await requestJson(client.server, 'POST', '/api/v1/gigs', {
          employerId: employer.id,
          title: 'Cebu Gig',
          description: 'Out of region',
          category: 'cleaning',
          estimatedHours: 4,
          offeredPricePhp: 300,
          barangay: 'Lahug',
          lat: 10.3157,
          lng: 123.8854,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await requestJson(client.server, 'POST', '/api/v1/gigs', {
          employerId: 'missing-employer',
          title: 'Valid Title',
          description: 'Valid description',
          category: 'cleaning',
          estimatedHours: 4,
          offeredPricePhp: 300,
          ...DAVAO_POBLACION,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(client.server, 'POST', '/api/v1/gigs', {
          employerId: worker.id,
          title: 'Valid Title',
          description: 'Valid description',
          category: 'cleaning',
          estimatedHours: 4,
          offeredPricePhp: 300,
          ...DAVAO_POBLACION,
        })
      ).status,
    ).toBe(403);

    // Employer ignores higher AI suggestion and posts at exact minimum floor (254 PHP)
    const gig1 = await requestJson<{
      gig: { id: string; followedAiRecommendation: boolean; offeredPricePhp: number };
    }>(client.server, 'POST', '/api/v1/gigs', {
      employerId: employer.id,
      title: 'Unload Cement Bags',
      description: 'Move bags safely',
      category: 'construction',
      estimatedHours: 4,
      offeredPricePhp: 254,
      urgency: 'urgent',
      requiredSkills: ['lifting'],
      ...DAVAO_POBLACION,
    });
    expect(gig1.status).toBe(201);
    expect(gig1.data.gig.followedAiRecommendation).toBe(false);
    expect(gig1.data.gig.offeredPricePhp).toBe(254);

    // Employer posts 2 more gigs following AI price (total 3 = FREE limit)
    for (const title of ['Sweep Yard', 'Sort Nails']) {
      const created = await requestJson<{ gig: { followedAiRecommendation: boolean } }>(
        client.server,
        'POST',
        '/api/v1/gigs',
        {
          employerId: employer.id,
          title,
          description: 'Hardware chores',
          category: 'errands',
          estimatedHours: 4,
          offeredPricePhp: 280,
          ...DAVAO_POBLACION,
        },
      );
      expect(created.status).toBe(201);
      expect(created.data.gig.followedAiRecommendation).toBe(true);
    }

    // 4th active gig blocked on FREE tier
    const fourth = await requestJson<{ error: { code: string } }>(
      client.server,
      'POST',
      '/api/v1/gigs',
      {
        employerId: employer.id,
        title: 'Fourth Gig',
        description: 'Blocked on FREE',
        category: 'errands',
        estimatedHours: 2,
        offeredPricePhp: 150,
        ...DAVAO_POBLACION,
      },
    );
    expect(fourth.status).toBe(403);
    expect(fourth.data.error.code).toBe('QUOTA_EXCEEDED');

    // Upgrade to PRO -> 4th gig succeeds
    await requestJson(
      client.server,
      'PATCH',
      `/api/v1/users/${employer.id}/subscription`,
      { tier: 'PRO' },
    );
    const fourthAfterPro = await requestJson(client.server, 'POST', '/api/v1/gigs', {
      employerId: employer.id,
      title: 'Fourth Gig',
      description: 'Allowed on PRO',
      category: 'errands',
      estimatedHours: 2,
      offeredPricePhp: 150,
      ...DAVAO_POBLACION,
    });
    expect(fourthAfterPro.status).toBe(201);
  });

  it('discovers nearby gigs by proximity and manages employee desired-gigs queue', async () => {
    const employer = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Davao Logistics',
        role: 'employer',
        tier: 'PRO',
        ...DAVAO_POBLACION,
      })
    ).data;
    const worker = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Carlo',
        role: 'employee',
        tier: 'FREE',
        ...DAVAO_POBLACION,
      })
    ).data;

    const gigIds: string[] = [];
    const locations = [
      { title: 'Buhangin Delivery', ...DAVAO_BUHANGIN },
      { title: 'Poblacion Errand 1', ...DAVAO_POBLACION },
      { title: 'Matina Helper', ...DAVAO_MATINA },
      { title: 'Poblacion Errand 2', ...DAVAO_POBLACION },
      { title: 'Poblacion Errand 3', ...DAVAO_POBLACION },
      { title: 'Poblacion Errand 4', ...DAVAO_POBLACION },
    ];

    for (const loc of locations) {
      const res = await requestJson<{ gig: { id: string } }>(
        client.server,
        'POST',
        '/api/v1/gigs',
        {
          employerId: employer.id,
          title: loc.title,
          description: 'Local Davao task',
          category: 'delivery',
          estimatedHours: 4,
          offeredPricePhp: 320,
          barangay: loc.barangay,
          lat: loc.lat,
          lng: loc.lng,
        },
      );
      gigIds.push(res.data.gig.id);
    }

    // Nearby search within 5km excludes Buhangin (~5.2km) and orders Poblacion before Matina
    const nearby = await requestJson<{
      gigs: Array<{ title: string; distanceKm: number }>;
      count: number;
    }>(
      client.server,
      'GET',
      `/api/v1/gigs/nearby?lat=${DAVAO_POBLACION.lat}&lng=${DAVAO_POBLACION.lng}&radiusKm=5`,
    );
    expect(nearby.status).toBe(200);
    expect(nearby.data.count).toBe(5);
    expect(nearby.data.gigs[0].distanceKm).toBe(0);
    expect(nearby.data.gigs[4].title).toBe('Matina Helper');

    // Nearby error cases & single gig lookup
    expect((await requestJson(client.server, 'GET', '/api/v1/gigs/nearby')).status).toBe(422);
    expect(
      (await requestJson(client.server, 'GET', '/api/v1/gigs/nearby?lat=14.5&lng=121.0')).status,
    ).toBe(422);
    expect((await requestJson(client.server, 'GET', `/api/v1/gigs/${gigIds[0]}`)).status).toBe(200);
    expect((await requestJson(client.server, 'GET', '/api/v1/gigs/missing-gig')).status).toBe(404);

    // Save 5 gigs (Buhangin first, then closer ones) -> sorted closest-first
    for (let i = 0; i < 5; i++) {
      const saved = await requestJson(
        client.server,
        'POST',
        `/api/v1/users/${worker.id}/saved-gigs`,
        { gigId: gigIds[i], note: `Wish #${i + 1}` },
      );
      expect(saved.status).toBe(201);
    }

    // 6th saved gig rejected on FREE tier
    const sixthSave = await requestJson<{ error: { code: string } }>(
      client.server,
      'POST',
      `/api/v1/users/${worker.id}/saved-gigs`,
      { gigId: gigIds[5] },
    );
    expect(sixthSave.status).toBe(403);
    expect(sixthSave.data.error.code).toBe('QUOTA_EXCEEDED');

    // List saved gigs (default origin = employee coordinates)
    const savedList = await requestJson<{
      items: Array<{ gigId: string; distanceKm: number }>;
      count: number;
    }>(client.server, 'GET', `/api/v1/users/${worker.id}/saved-gigs`);
    expect(savedList.status).toBe(200);
    expect(savedList.data.count).toBe(5);
    expect(savedList.data.items[0].distanceKm).toBe(0);
    expect(savedList.data.items[4].gigId).toBe(gigIds[0]);

    // List saved gigs with custom origin query near Buhangin
    const savedFromBuhangin = await requestJson<{
      items: Array<{ gigId: string; distanceKm: number }>;
    }>(
      client.server,
      'GET',
      `/api/v1/users/${worker.id}/saved-gigs?lat=${DAVAO_BUHANGIN.lat}&lng=${DAVAO_BUHANGIN.lng}`,
    );
    expect(savedFromBuhangin.status).toBe(200);
    expect(savedFromBuhangin.data.items[0].gigId).toBe(gigIds[0]);

    // Delete saved gig and test saved-gig error branches
    const deleted = await requestJson(
      client.server,
      'DELETE',
      `/api/v1/users/${worker.id}/saved-gigs/${gigIds[1]}`,
    );
    expect(deleted.status).toBe(200);
    expect(
      (
        await requestJson(
          client.server,
          'DELETE',
          `/api/v1/users/${worker.id}/saved-gigs/${gigIds[1]}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(
          client.server,
          'DELETE',
          `/api/v1/users/missing-user/saved-gigs/${gigIds[1]}`,
        )
      ).status,
    ).toBe(404);

    // Saved-gig guard branches
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/users/${worker.id}/saved-gigs`,
          { gigId: '' },
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          '/api/v1/users/missing-user/saved-gigs',
          { gigId: gigIds[0] },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/users/${employer.id}/saved-gigs`,
          { gigId: gigIds[0] },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/users/${worker.id}/saved-gigs`,
          { gigId: 'missing-gig' },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/users/${worker.id}/saved-gigs`,
          { gigId: gigIds[0] },
        )
      ).status,
    ).toBe(409);

    expect(
      (await requestJson(client.server, 'GET', '/api/v1/users/missing-user/saved-gigs')).status,
    ).toBe(404);
    expect(
      (await requestJson(client.server, 'GET', `/api/v1/users/${employer.id}/saved-gigs`)).status,
    ).toBe(403);
    expect(
      (
        await requestJson(
          client.server,
          'GET',
          `/api/v1/users/${worker.id}/saved-gigs?lat=not-a-number`,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await requestJson(
          client.server,
          'GET',
          `/api/v1/users/${worker.id}/saved-gigs?lat=14.5&lng=121.0`,
        )
      ).status,
    ).toBe(422);
  });

  it('runs end-to-end application, acceptance, minimum-wage-protected settlement, and error guards', async () => {
    const employer = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Employer Corp',
        role: 'employer',
        tier: 'PRO',
        ...DAVAO_POBLACION,
      })
    ).data;
    const otherEmployer = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Other Employer',
        role: 'employer',
        ...DAVAO_POBLACION,
      })
    ).data;
    const worker = (
      await requestJson<{ id: string }>(client.server, 'POST', '/api/v1/users', {
        name: 'Worker Marco',
        role: 'employee',
        tier: 'FREE',
        ...DAVAO_POBLACION,
      })
    ).data;

    // Create 6 open gigs (first priced exactly at minimum wage 254 PHP for 4h)
    const gigs: string[] = [];
    for (let i = 0; i < 6; i++) {
      const created = await requestJson<{ gig: { id: string } }>(
        client.server,
        'POST',
        '/api/v1/gigs',
        {
          employerId: employer.id,
          title: `Task ${i + 1}`,
          description: 'Davao gig work',
          category: 'cleaning',
          estimatedHours: 4,
          offeredPricePhp: i === 0 ? 254 : 400,
          ...DAVAO_POBLACION,
        },
      );
      gigs.push(created.data.gig.id);
    }

    // Apply to 5 gigs (FREE limit)
    const appIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const applied = await requestJson<{ id: string }>(
        client.server,
        'POST',
        `/api/v1/gigs/${gigs[i]}/applications`,
        { employeeId: worker.id, message: 'Ready to work' },
      );
      expect(applied.status).toBe(201);
      appIds.push(applied.data.id);
    }

    // 6th active application blocked by FREE quota
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/gigs/${gigs[5]}/applications`,
          { employeeId: worker.id },
        )
      ).status,
    ).toBe(403);

    // Application guard branches
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/gigs/${gigs[0]}/applications`,
          { employeeId: '' },
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          '/api/v1/gigs/missing-gig/applications',
          { employeeId: worker.id },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/gigs/${gigs[0]}/applications`,
          { employeeId: 'missing-worker' },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/gigs/${gigs[0]}/applications`,
          { employeeId: employer.id },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/gigs/${gigs[0]}/applications`,
          { employeeId: worker.id },
        )
      ).status,
    ).toBe(409);

    // Accept guard branches
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/accept`, {
          employerId: '',
          applicationId: appIds[0],
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await requestJson(client.server, 'POST', '/api/v1/gigs/missing-gig/accept', {
          employerId: employer.id,
          applicationId: appIds[0],
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/accept`, {
          employerId: otherEmployer.id,
          applicationId: appIds[0],
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/accept`, {
          employerId: employer.id,
          applicationId: 'missing-app',
        })
      ).status,
    ).toBe(404);
    // Application belonging to a different gig
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/accept`, {
          employerId: employer.id,
          applicationId: appIds[1],
        })
      ).status,
    ).toBe(404);

    // Complete guard before assignment
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/complete`, {
          employerId: employer.id,
        })
      ).status,
    ).toBe(409);

    // Accept gig[0] (254 PHP exact minimum floor)
    const accepted = await requestJson<{ gig: { status: string } }>(
      client.server,
      'POST',
      `/api/v1/gigs/${gigs[0]}/accept`,
      { employerId: employer.id, applicationId: appIds[0] },
    );
    expect(accepted.status).toBe(200);
    expect(accepted.data.gig.status).toBe('ASSIGNED');

    // Cannot save, apply, or re-accept an ASSIGNED gig
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/users/${worker.id}/saved-gigs`,
          { gigId: gigs[0] },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await requestJson(
          client.server,
          'POST',
          `/api/v1/gigs/${gigs[0]}/applications`,
          { employeeId: worker.id },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/accept`, {
          employerId: employer.id,
          applicationId: appIds[0],
        })
      ).status,
    ).toBe(409);

    // Complete guard branches
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/complete`, {
          employerId: '',
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await requestJson(client.server, 'POST', '/api/v1/gigs/missing-gig/complete', {
          employerId: employer.id,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await requestJson(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/complete`, {
          employerId: otherEmployer.id,
        })
      ).status,
    ).toBe(403);

    // Complete gig[0] -> minimum wage protection sets employeeFeePhp = 0, PRO employer pays 2%
    const completed = await requestJson<{
      gig: { status: string };
      transaction: {
        grossAmountPhp: number;
        employerFeePhp: number;
        employeeFeePhp: number;
        workerNetPayoutPhp: number;
        feeProtectedByMinimumWageFloor: boolean;
      };
    }>(client.server, 'POST', `/api/v1/gigs/${gigs[0]}/complete`, {
      employerId: employer.id,
    });
    expect(completed.status).toBe(200);
    expect(completed.data.gig.status).toBe('COMPLETED');
    expect(completed.data.transaction.grossAmountPhp).toBe(254);
    expect(completed.data.transaction.employerFeePhp).toBe(5.08);
    expect(completed.data.transaction.employeeFeePhp).toBe(0);
    expect(completed.data.transaction.workerNetPayoutPhp).toBe(254);
    expect(completed.data.transaction.feeProtectedByMinimumWageFloor).toBe(true);

    // List transactions
    const txRes = await requestJson<{ count: number }>(
      client.server,
      'GET',
      `/api/v1/users/${worker.id}/transactions`,
    );
    expect(txRes.status).toBe(200);
    expect(txRes.data.count).toBe(1);

    expect(
      (await requestJson(client.server, 'GET', '/api/v1/users/missing/transactions')).status,
    ).toBe(404);
  });

  it('returns structured 400 on malformed JSON and generic 500 on unexpected errors', async () => {
    const badJsonRes = await sendRawHttp<{ error: { code: string } }>(
      client.server,
      'POST',
      '/api/v1/users',
      '{"broken": ',
    );
    expect(badJsonRes.status).toBe(400);
    expect(badJsonRes.data.error.code).toBe('INVALID_JSON');

    // Close underlying DB to force unexpected errors in both sync and async handlers
    client.db.close();

    const syncErrRes = await requestJson<{ error: { code: string } }>(
      client.server,
      'GET',
      '/api/v1/users/any-id',
    );
    expect(syncErrRes.status).toBe(500);
    expect(syncErrRes.data.error.code).toBe('INTERNAL_ERROR');

    const asyncErrRes = await requestJson<{ error: { code: string } }>(
      client.server,
      'POST',
      '/api/v1/gigs',
      {
        employerId: 'any-id',
        title: 'Valid Title',
        description: 'Valid description',
        category: 'cleaning',
        estimatedHours: 4,
        offeredPricePhp: 300,
        ...DAVAO_POBLACION,
      },
    );
    expect(asyncErrRes.status).toBe(500);
    expect(asyncErrRes.data.error.code).toBe('INTERNAL_ERROR');
  });
});
