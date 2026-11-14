import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { DatabaseSync } from 'node:sqlite';
import type { z } from 'zod';
import { createDatabase } from '../db/database.js';
import { GawRepository } from '../db/repository.js';
import { seedDemoMarketplace } from '../db/seed.js';
import {
  DAVAO_DAILY_MIN_WAGE_PHP,
  DAVAO_HOURLY_MIN_WAGE_PHP,
  TIER_CONFIG,
} from '../domain/constants.js';
import {
  calculateSettlementBreakdown,
  checkEmployeeQueueQuota,
  checkEmployerPostingQuota,
} from '../domain/fee-engine.js';
import { isWithinDavaoRegion } from '../domain/geo.js';
import {
  didFollowAiRecommendation,
  estimateGigPriceWithAdvisor,
  type ExternalPricingProvider,
} from '../domain/pricing-advisor.js';
import { validateGigPrice } from '../domain/wage-policy.js';
import {
  AcceptApplicationSchema,
  ApplyGigSchema,
  CompleteGigSchema,
  CreateGigSchema,
  CreateUserSchema,
  NearbyGigsQuerySchema,
  PricingEstimateRequestSchema,
  SaveGigSchema,
  SavedGigsQuerySchema,
  UpdateSubscriptionSchema,
} from './schemas.js';

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  res.status(status).json({
    error:
      details === undefined ? { code, message } : { code, message, details },
  });
}

function parseOrSendError<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
  res: Response,
): T | null {
  const result = schema.safeParse(input);
  if (!result.success) {
    sendError(
      res,
      422,
      'VALIDATION_ERROR',
      'Request validation failed',
      result.error.flatten(),
    );
    return null;
  }
  return result.data;
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

function toNullableLimit(limit: number): number | null {
  return Number.isFinite(limit) ? limit : null;
}

/**
 * Creates the configured Express application for the GAW Davao City gig marketplace API.
 */
export function createApp(
  db: DatabaseSync = createDatabase(),
  pricingProvider?: ExternalPricingProvider,
): Express {
  const app = express();
  const repo = new GawRepository(db);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PATCH,DELETE,OPTIONS',
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'ok',
      region: 'Davao City (Region XI)',
      dailyMinWagePhp: DAVAO_DAILY_MIN_WAGE_PHP,
      hourlyMinWagePhp: DAVAO_HOURLY_MIN_WAGE_PHP,
    });
  });

  app.post('/api/v1/marketplace/seed', (_req, res) => {
    const result = seedDemoMarketplace(repo);
    res.json({ status: 'seeded', ...result });
  });

  app.post('/api/v1/users', (req, res) => {
    const data = parseOrSendError(CreateUserSchema, req.body, res);
    if (!data) return;

    if (!isWithinDavaoRegion(data.lat, data.lng)) {
      sendError(
        res,
        422,
        'OUTSIDE_DAVAO_REGION',
        'Coordinates must fall within Davao City (Region XI) service bounds',
      );
      return;
    }

    const user = repo.createUser(data);
    res.status(201).json(user);
  });

  app.get('/api/v1/users/:userId', (req, res) => {
    const user = repo.getUserById(req.params.userId);
    if (!user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const tierCfg = TIER_CONFIG[user.tier];
    const quota =
      user.role === 'employer'
        ? {
            maxActiveOpenGigs: toNullableLimit(tierCfg.maxActiveOpenGigs),
            activeOpenGigs: repo.countEmployerOpenGigs(user.id),
            employerFeeRate: tierCfg.employerFeeRate,
          }
        : {
            maxSavedGigs: toNullableLimit(tierCfg.maxSavedOrActiveEmployeeGigs),
            savedGigsCount: repo.countEmployeeSavedGigs(user.id),
            maxActiveApplications: toNullableLimit(
              tierCfg.maxSavedOrActiveEmployeeGigs,
            ),
            activeApplicationsCount: repo.countEmployeeActiveApplications(
              user.id,
            ),
            employeeFeeRate: tierCfg.employeeFeeRate,
          };

    res.json({ ...user, quota });
  });

  app.patch('/api/v1/users/:userId/subscription', (req, res) => {
    const data = parseOrSendError(UpdateSubscriptionSchema, req.body, res);
    if (!data) return;

    const updated = repo.updateUserTier(req.params.userId, data.tier);
    if (!updated) {
      sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    res.json(updated);
  });

  app.post(
    '/api/v1/pricing/estimate',
    asyncRoute(async (req, res) => {
      const data = parseOrSendError(PricingEstimateRequestSchema, req.body, res);
      if (!data) return;

      const estimate = await estimateGigPriceWithAdvisor(data, pricingProvider);
      res.json(estimate);
    }),
  );

  app.post(
    '/api/v1/gigs',
    asyncRoute(async (req, res) => {
      const data = parseOrSendError(CreateGigSchema, req.body, res);
      if (!data) return;

      if (!isWithinDavaoRegion(data.lat, data.lng)) {
        sendError(
          res,
          422,
          'OUTSIDE_DAVAO_REGION',
          'Gig coordinates must fall within Davao City (Region XI) service bounds',
        );
        return;
      }

      const employer = repo.getUserById(data.employerId);
      if (!employer) {
        sendError(res, 404, 'USER_NOT_FOUND', 'Employer account not found');
        return;
      }

      if (employer.role !== 'employer') {
        sendError(
          res,
          403,
          'FORBIDDEN_ROLE',
          'Only employer accounts can create gigs',
        );
        return;
      }

      const quota = checkEmployerPostingQuota(
        employer.tier,
        repo.countEmployerOpenGigs(employer.id),
      );
      if (!quota.allowed) {
        sendError(res, 403, 'QUOTA_EXCEEDED', quota.reason as string, quota);
        return;
      }

      const wageCheck = validateGigPrice(
        data.estimatedHours,
        data.offeredPricePhp,
      );
      if (!wageCheck.isValid) {
        sendError(
          res,
          422,
          'BELOW_MINIMUM_WAGE',
          `Offered price ₱${wageCheck.offeredPricePhp.toFixed(2)} is below Davao Region XI minimum floor ₱${wageCheck.minimumRequiredPhp.toFixed(2)}`,
          wageCheck,
        );
        return;
      }

      const pricingAdvice = await estimateGigPriceWithAdvisor(
        {
          category: data.category,
          estimatedHours: data.estimatedHours,
          urgency: data.urgency,
          requiredSkills: data.requiredSkills,
        },
        pricingProvider,
      );

      const followedAiRecommendation = didFollowAiRecommendation(
        wageCheck.offeredPricePhp,
        pricingAdvice.suggestedMinPhp,
        pricingAdvice.suggestedMaxPhp,
      );

      const gig = repo.createGig({
        employerId: employer.id,
        title: data.title,
        description: data.description,
        category: data.category,
        estimatedHours: data.estimatedHours,
        offeredPricePhp: wageCheck.offeredPricePhp,
        minimumRequiredPhp: wageCheck.minimumRequiredPhp,
        aiRecommendedPhp: pricingAdvice.recommendedPhp,
        followedAiRecommendation,
        urgency: data.urgency,
        barangay: data.barangay,
        lat: data.lat,
        lng: data.lng,
      });

      res.status(201).json({ gig, pricingAdvice });
    }),
  );

  app.get('/api/v1/gigs/nearby', (req, res) => {
    const query = parseOrSendError(NearbyGigsQuerySchema, req.query, res);
    if (!query) return;

    if (!isWithinDavaoRegion(query.lat, query.lng)) {
      sendError(
        res,
        422,
        'OUTSIDE_DAVAO_REGION',
        'Search coordinates must fall within Davao City (Region XI) service bounds',
      );
      return;
    }

    const gigs = repo.listNearbyOpenGigs(query);
    res.json({ gigs, count: gigs.length });
  });

  app.get('/api/v1/gigs/:gigId', (req, res) => {
    const gig = repo.getGigById(req.params.gigId);
    if (!gig) {
      sendError(res, 404, 'GIG_NOT_FOUND', 'Gig not found');
      return;
    }
    res.json(gig);
  });

  app.post('/api/v1/users/:employeeId/saved-gigs', (req, res) => {
    const data = parseOrSendError(SaveGigSchema, req.body, res);
    if (!data) return;

    const employee = repo.getUserById(req.params.employeeId);
    if (!employee) {
      sendError(res, 404, 'USER_NOT_FOUND', 'Employee account not found');
      return;
    }

    if (employee.role !== 'employee') {
      sendError(
        res,
        403,
        'FORBIDDEN_ROLE',
        'Only employee accounts can save desired gigs',
      );
      return;
    }

    const gig = repo.getGigById(data.gigId);
    if (!gig) {
      sendError(res, 404, 'GIG_NOT_FOUND', 'Gig not found');
      return;
    }

    if (gig.status !== 'OPEN') {
      sendError(
        res,
        409,
        'GIG_NOT_OPEN',
        'Only OPEN gigs can be added to the desired gigs list',
      );
      return;
    }

    if (repo.hasSavedGig(employee.id, gig.id)) {
      sendError(
        res,
        409,
        'ALREADY_SAVED',
        'Gig is already in the employee desired gigs list',
      );
      return;
    }

    const quota = checkEmployeeQueueQuota(
      employee.tier,
      repo.countEmployeeSavedGigs(employee.id),
    );
    if (!quota.allowed) {
      sendError(res, 403, 'QUOTA_EXCEEDED', quota.reason as string, quota);
      return;
    }

    const saved = repo.saveGigForEmployee({
      employeeId: employee.id,
      gigId: gig.id,
      note: data.note,
    });
    res.status(201).json(saved);
  });

  app.get('/api/v1/users/:employeeId/saved-gigs', (req, res) => {
    const employee = repo.getUserById(req.params.employeeId);
    if (!employee) {
      sendError(res, 404, 'USER_NOT_FOUND', 'Employee account not found');
      return;
    }

    if (employee.role !== 'employee') {
      sendError(
        res,
        403,
        'FORBIDDEN_ROLE',
        'Only employee accounts have a desired gigs list',
      );
      return;
    }

    const query = parseOrSendError(SavedGigsQuerySchema, req.query, res);
    if (!query) return;

    const origin =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : { lat: employee.lat, lng: employee.lng };

    if (!isWithinDavaoRegion(origin.lat, origin.lng)) {
      sendError(
        res,
        422,
        'OUTSIDE_DAVAO_REGION',
        'Coordinates must fall within Davao City (Region XI) service bounds',
      );
      return;
    }

    const items = repo.listSavedGigsForEmployee(employee.id, origin);
    res.json({ items, count: items.length });
  });

  app.delete('/api/v1/users/:employeeId/saved-gigs/:gigId', (req, res) => {
    const employee = repo.getUserById(req.params.employeeId);
    if (!employee) {
      sendError(res, 404, 'USER_NOT_FOUND', 'Employee account not found');
      return;
    }

    const removed = repo.removeSavedGigForEmployee(
      employee.id,
      req.params.gigId,
    );
    if (!removed) {
      sendError(
        res,
        404,
        'SAVED_GIG_NOT_FOUND',
        'Gig is not in the employee desired gigs list',
      );
      return;
    }

    res.json({ removed: true });
  });

  app.post('/api/v1/gigs/:gigId/applications', (req, res) => {
    const data = parseOrSendError(ApplyGigSchema, req.body, res);
    if (!data) return;

    const gig = repo.getGigById(req.params.gigId);
    if (!gig) {
      sendError(res, 404, 'GIG_NOT_FOUND', 'Gig not found');
      return;
    }

    if (gig.status !== 'OPEN') {
      sendError(
        res,
        409,
        'GIG_NOT_OPEN',
        'Applications are only accepted for OPEN gigs',
      );
      return;
    }

    const employee = repo.getUserById(data.employeeId);
    if (!employee) {
      sendError(res, 404, 'USER_NOT_FOUND', 'Employee account not found');
      return;
    }

    if (employee.role !== 'employee') {
      sendError(
        res,
        403,
        'FORBIDDEN_ROLE',
        'Only employee accounts can apply for gigs',
      );
      return;
    }

    if (repo.hasAppliedToGig(gig.id, employee.id)) {
      sendError(
        res,
        409,
        'ALREADY_APPLIED',
        'Employee has already applied to this gig',
      );
      return;
    }

    const quota = checkEmployeeQueueQuota(
      employee.tier,
      repo.countEmployeeActiveApplications(employee.id),
    );
    if (!quota.allowed) {
      sendError(res, 403, 'QUOTA_EXCEEDED', quota.reason as string, quota);
      return;
    }

    const application = repo.applyToGig({
      gigId: gig.id,
      employeeId: employee.id,
      message: data.message,
    });
    res.status(201).json(application);
  });

  app.post('/api/v1/gigs/:gigId/accept', (req, res) => {
    const data = parseOrSendError(AcceptApplicationSchema, req.body, res);
    if (!data) return;

    const gig = repo.getGigById(req.params.gigId);
    if (!gig) {
      sendError(res, 404, 'GIG_NOT_FOUND', 'Gig not found');
      return;
    }

    if (gig.employerId !== data.employerId) {
      sendError(
        res,
        403,
        'FORBIDDEN_OWNER',
        'Only the gig owner can accept an application',
      );
      return;
    }

    if (gig.status !== 'OPEN') {
      sendError(
        res,
        409,
        'GIG_NOT_OPEN',
        'Only OPEN gigs can accept an application',
      );
      return;
    }

    const application = repo.getApplicationById(data.applicationId);
    if (!application || application.gigId !== gig.id) {
      sendError(
        res,
        404,
        'APPLICATION_NOT_FOUND',
        'Application not found for this gig',
      );
      return;
    }

    const accepted = repo.acceptGigApplication(
      gig.id,
      application.id,
      application.employeeId,
    );
    res.json(accepted);
  });

  app.post('/api/v1/gigs/:gigId/complete', (req, res) => {
    const data = parseOrSendError(CompleteGigSchema, req.body, res);
    if (!data) return;

    const gig = repo.getGigById(req.params.gigId);
    if (!gig) {
      sendError(res, 404, 'GIG_NOT_FOUND', 'Gig not found');
      return;
    }

    if (gig.employerId !== data.employerId) {
      sendError(
        res,
        403,
        'FORBIDDEN_OWNER',
        'Only the gig owner can complete this gig',
      );
      return;
    }

    if (gig.status !== 'ASSIGNED') {
      sendError(
        res,
        409,
        'GIG_NOT_ASSIGNED',
        'Only ASSIGNED gigs can be completed',
      );
      return;
    }

    const employeeId = gig.assignedEmployeeId as string;
    const employer = repo.getUserById(gig.employerId) as NonNullable<
      ReturnType<typeof repo.getUserById>
    >;
    const employee = repo.getUserById(employeeId) as NonNullable<
      ReturnType<typeof repo.getUserById>
    >;

    const breakdown = calculateSettlementBreakdown({
      grossAmountPhp: gig.offeredPricePhp,
      estimatedHours: gig.estimatedHours,
      employerTier: employer.tier,
      employeeTier: employee.tier,
    });

    const completed = repo.completeGig({
      gigId: gig.id,
      employerId: employer.id,
      employeeId: employee.id,
      breakdown,
    });

    res.json(completed);
  });

  app.get('/api/v1/users/:userId/transactions', (req, res) => {
    const user = repo.getUserById(req.params.userId);
    if (!user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const transactions = repo.listTransactionsForUser(user.id);
    res.json({ transactions, count: transactions.length });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError) {
      sendError(res, 400, 'INVALID_JSON', 'Malformed JSON request body');
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  });

  return app;
}
