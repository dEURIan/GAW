import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  ApplicationStatus,
  GigCategory,
  GigStatus,
  SubscriptionTier,
  UrgencyLevel,
  UserRole,
} from '../domain/constants.js';
import type { SettlementBreakdown } from '../domain/fee-engine.js';
import {
  calculateHaversineDistanceKm,
  type Coordinates,
} from '../domain/geo.js';

export interface UserRecord {
  id: string;
  name: string;
  role: UserRole;
  tier: SubscriptionTier;
  barangay: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  role: UserRole;
  tier: SubscriptionTier;
  barangay: string;
  lat: number;
  lng: number;
}

export interface GigRecord {
  id: string;
  employerId: string;
  title: string;
  description: string;
  category: GigCategory;
  estimatedHours: number;
  offeredPricePhp: number;
  minimumRequiredPhp: number;
  aiRecommendedPhp: number;
  followedAiRecommendation: boolean;
  urgency: UrgencyLevel;
  barangay: string;
  lat: number;
  lng: number;
  status: GigStatus;
  assignedEmployeeId: string | null;
  createdAt: string;
}

export interface CreateGigInput {
  employerId: string;
  title: string;
  description: string;
  category: GigCategory;
  estimatedHours: number;
  offeredPricePhp: number;
  minimumRequiredPhp: number;
  aiRecommendedPhp: number;
  followedAiRecommendation: boolean;
  urgency: UrgencyLevel;
  barangay: string;
  lat: number;
  lng: number;
}

export interface NearbyGigRecord extends GigRecord {
  distanceKm: number;
  employerName: string;
  employerTier: SubscriptionTier;
}

export interface NearbyGigsSearchParams {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: GigCategory;
  minPayPhp?: number;
  limit: number;
}

export interface SavedGigRecord {
  employeeId: string;
  gigId: string;
  note: string;
  createdAt: string;
}

export interface SavedGigWithDistance extends SavedGigRecord {
  distanceKm: number;
  gig: GigRecord;
}

export interface GigApplicationRecord {
  id: string;
  gigId: string;
  employeeId: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface TransactionRecord extends SettlementBreakdown {
  id: string;
  gigId: string;
  employerId: string;
  employeeId: string;
  createdAt: string;
}

type RawRow = Record<string, unknown>;

function mapUserRow(row: RawRow): UserRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as UserRole,
    tier: row.tier as SubscriptionTier,
    barangay: row.barangay as string,
    lat: row.lat as number,
    lng: row.lng as number,
    createdAt: row.created_at as string,
  };
}

function mapGigRow(row: RawRow): GigRecord {
  return {
    id: row.id as string,
    employerId: row.employer_id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as GigCategory,
    estimatedHours: row.estimated_hours as number,
    offeredPricePhp: row.offered_price_php as number,
    minimumRequiredPhp: row.minimum_required_php as number,
    aiRecommendedPhp: row.ai_recommended_php as number,
    followedAiRecommendation: Boolean(row.followed_ai_recommendation),
    urgency: row.urgency as UrgencyLevel,
    barangay: row.barangay as string,
    lat: row.lat as number,
    lng: row.lng as number,
    status: row.status as GigStatus,
    assignedEmployeeId: row.assigned_employee_id as string | null,
    createdAt: row.created_at as string,
  };
}

function mapApplicationRow(row: RawRow): GigApplicationRecord {
  return {
    id: row.id as string,
    gigId: row.gig_id as string,
    employeeId: row.employee_id as string,
    message: row.message as string,
    status: row.status as ApplicationStatus,
    createdAt: row.created_at as string,
  };
}

function mapTransactionRow(row: RawRow): TransactionRecord {
  return {
    id: row.id as string,
    gigId: row.gig_id as string,
    employerId: row.employer_id as string,
    employeeId: row.employee_id as string,
    grossAmountPhp: row.gross_amount_php as number,
    minimumRequiredPhp: row.minimum_required_php as number,
    employerFeePhp: row.employer_fee_php as number,
    employerTotalChargePhp: row.employer_total_charge_php as number,
    employeeFeePhp: row.employee_fee_php as number,
    workerNetPayoutPhp: row.worker_net_payout_php as number,
    platformRevenuePhp: row.platform_revenue_php as number,
    feeProtectedByMinimumWageFloor: Boolean(row.fee_protected_by_min_wage),
    createdAt: row.created_at as string,
  };
}

function tierPriority(tier: SubscriptionTier): number {
  return tier === 'PRO' ? 1 : 0;
}

/**
 * Parameterized SQLite repository managing users, gigs, desired-gig lists, applications, and settlements.
 */
export class GawRepository {
  constructor(private readonly db: DatabaseSync) {}

  runInTransaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  createUser(input: CreateUserInput): UserRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO users (id, name, role, tier, barangay, lat, lng, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.role,
        input.tier,
        input.barangay,
        input.lat,
        input.lng,
        createdAt,
      );

    return {
      id,
      name: input.name,
      role: input.role,
      tier: input.tier,
      barangay: input.barangay,
      lat: input.lat,
      lng: input.lng,
      createdAt,
    };
  }

  getUserById(id: string): UserRecord | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as RawRow | undefined;
    return row ? mapUserRow(row) : null;
  }

  updateUserTier(id: string, tier: SubscriptionTier): UserRecord | null {
    const result = this.db
      .prepare('UPDATE users SET tier = ? WHERE id = ?')
      .run(tier, id);

    if (result.changes === 0) {
      return null;
    }

    return this.getUserById(id);
  }

  countEmployerOpenGigs(employerId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM gigs WHERE employer_id = ? AND status = 'OPEN'`,
      )
      .get(employerId) as { count: number };
    return row.count;
  }

  createGig(input: CreateGigInput): GigRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO gigs (
          id, employer_id, title, description, category, estimated_hours,
          offered_price_php, minimum_required_php, ai_recommended_php,
          followed_ai_recommendation, urgency, barangay, lat, lng, status,
          assigned_employee_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NULL, ?)`,
      )
      .run(
        id,
        input.employerId,
        input.title,
        input.description,
        input.category,
        input.estimatedHours,
        input.offeredPricePhp,
        input.minimumRequiredPhp,
        input.aiRecommendedPhp,
        input.followedAiRecommendation ? 1 : 0,
        input.urgency,
        input.barangay,
        input.lat,
        input.lng,
        createdAt,
      );

    return {
      id,
      employerId: input.employerId,
      title: input.title,
      description: input.description,
      category: input.category,
      estimatedHours: input.estimatedHours,
      offeredPricePhp: input.offeredPricePhp,
      minimumRequiredPhp: input.minimumRequiredPhp,
      aiRecommendedPhp: input.aiRecommendedPhp,
      followedAiRecommendation: input.followedAiRecommendation,
      urgency: input.urgency,
      barangay: input.barangay,
      lat: input.lat,
      lng: input.lng,
      status: 'OPEN',
      assignedEmployeeId: null,
      createdAt,
    };
  }

  getGigById(id: string): GigRecord | null {
    const row = this.db
      .prepare('SELECT * FROM gigs WHERE id = ?')
      .get(id) as RawRow | undefined;
    return row ? mapGigRow(row) : null;
  }

  listNearbyOpenGigs(params: NearbyGigsSearchParams): NearbyGigRecord[] {
    const conditions = [`g.status = 'OPEN'`];
    const values: SQLInputValue[] = [];

    if (params.category !== undefined) {
      conditions.push('g.category = ?');
      values.push(params.category);
    }

    if (params.minPayPhp !== undefined) {
      conditions.push('g.offered_price_php >= ?');
      values.push(params.minPayPhp);
    }

    const sql = `
      SELECT g.*, u.name AS employer_name, u.tier AS employer_tier
      FROM gigs g
      JOIN users u ON g.employer_id = u.id
      WHERE ${conditions.join(' AND ')}
    `;

    const rows = this.db.prepare(sql).all(...values) as RawRow[];
    const origin: Coordinates = { lat: params.lat, lng: params.lng };

    return rows
      .map((row): NearbyGigRecord => {
        const gig = mapGigRow(row);
        return {
          ...gig,
          distanceKm: calculateHaversineDistanceKm(origin, {
            lat: gig.lat,
            lng: gig.lng,
          }),
          employerName: row.employer_name as string,
          employerTier: row.employer_tier as SubscriptionTier,
        };
      })
      .filter((gig) => gig.distanceKm <= params.radiusKm)
      .sort((a, b) => {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        const tierDiff =
          tierPriority(b.employerTier) - tierPriority(a.employerTier);
        if (tierDiff !== 0) {
          return tierDiff;
        }
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, params.limit);
  }

  countEmployeeSavedGigs(employeeId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM saved_gigs WHERE employee_id = ?')
      .get(employeeId) as { count: number };
    return row.count;
  }

  hasSavedGig(employeeId: string, gigId: string): boolean {
    const row = this.db
      .prepare(
        'SELECT 1 AS found FROM saved_gigs WHERE employee_id = ? AND gig_id = ?',
      )
      .get(employeeId, gigId);
    return row !== undefined;
  }

  saveGigForEmployee(input: {
    employeeId: string;
    gigId: string;
    note: string;
  }): SavedGigRecord {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO saved_gigs (employee_id, gig_id, note, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(input.employeeId, input.gigId, input.note, createdAt);

    return {
      employeeId: input.employeeId,
      gigId: input.gigId,
      note: input.note,
      createdAt,
    };
  }

  removeSavedGigForEmployee(employeeId: string, gigId: string): boolean {
    const result = this.db
      .prepare('DELETE FROM saved_gigs WHERE employee_id = ? AND gig_id = ?')
      .run(employeeId, gigId);
    return result.changes > 0;
  }

  listSavedGigsForEmployee(
    employeeId: string,
    origin: Coordinates,
  ): SavedGigWithDistance[] {
    const rows = this.db
      .prepare(
        `SELECT s.employee_id AS saved_employee_id, s.gig_id AS saved_gig_id,
                s.note AS saved_note, s.created_at AS saved_created_at,
                g.*
         FROM saved_gigs s
         JOIN gigs g ON s.gig_id = g.id
         WHERE s.employee_id = ?`,
      )
      .all(employeeId) as RawRow[];

    return rows
      .map((row): SavedGigWithDistance => {
        const gig = mapGigRow(row);
        return {
          employeeId: row.saved_employee_id as string,
          gigId: row.saved_gig_id as string,
          note: row.saved_note as string,
          createdAt: row.saved_created_at as string,
          distanceKm: calculateHaversineDistanceKm(origin, {
            lat: gig.lat,
            lng: gig.lng,
          }),
          gig,
        };
      })
      .sort((a, b) => {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  countEmployeeActiveApplications(employeeId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM gig_applications
         WHERE employee_id = ? AND status = 'PENDING'`,
      )
      .get(employeeId) as { count: number };
    return row.count;
  }

  hasAppliedToGig(gigId: string, employeeId: string): boolean {
    const row = this.db
      .prepare(
        'SELECT 1 AS found FROM gig_applications WHERE gig_id = ? AND employee_id = ?',
      )
      .get(gigId, employeeId);
    return row !== undefined;
  }

  applyToGig(input: {
    gigId: string;
    employeeId: string;
    message: string;
  }): GigApplicationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO gig_applications (id, gig_id, employee_id, message, status, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      )
      .run(id, input.gigId, input.employeeId, input.message, createdAt);

    return {
      id,
      gigId: input.gigId,
      employeeId: input.employeeId,
      message: input.message,
      status: 'PENDING',
      createdAt,
    };
  }

  getApplicationById(applicationId: string): GigApplicationRecord | null {
    const row = this.db
      .prepare('SELECT * FROM gig_applications WHERE id = ?')
      .get(applicationId) as RawRow | undefined;
    return row ? mapApplicationRow(row) : null;
  }

  listGigApplications(gigId: string): GigApplicationRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM gig_applications WHERE gig_id = ? ORDER BY created_at ASC, rowid ASC`,
      )
      .all(gigId) as RawRow[];
    return rows.map(mapApplicationRow);
  }

  acceptGigApplication(
    gigId: string,
    applicationId: string,
    employeeId: string,
  ): { gig: GigRecord; application: GigApplicationRecord } {
    return this.runInTransaction(() => {
      this.db
        .prepare(
          `UPDATE gigs SET status = 'ASSIGNED', assigned_employee_id = ? WHERE id = ?`,
        )
        .run(employeeId, gigId);

      this.db
        .prepare(
          `UPDATE gig_applications SET status = 'ACCEPTED' WHERE id = ?`,
        )
        .run(applicationId);

      this.db
        .prepare(
          `UPDATE gig_applications SET status = 'REJECTED' WHERE gig_id = ? AND id != ?`,
        )
        .run(gigId, applicationId);

      const gig = this.getGigById(gigId) as GigRecord;
      const application = this.getApplicationById(
        applicationId,
      ) as GigApplicationRecord;

      return { gig, application };
    });
  }

  completeGig(input: {
    gigId: string;
    employerId: string;
    employeeId: string;
    breakdown: SettlementBreakdown;
  }): { gig: GigRecord; transaction: TransactionRecord } {
    return this.runInTransaction(() => {
      this.db
        .prepare(`UPDATE gigs SET status = 'COMPLETED' WHERE id = ?`)
        .run(input.gigId);

      const id = randomUUID();
      const createdAt = new Date().toISOString();

      this.db
        .prepare(
          `INSERT INTO transactions (
            id, gig_id, employer_id, employee_id,
            gross_amount_php, minimum_required_php,
            employer_fee_php, employer_total_charge_php,
            employee_fee_php, worker_net_payout_php,
            platform_revenue_php, fee_protected_by_min_wage,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.gigId,
          input.employerId,
          input.employeeId,
          input.breakdown.grossAmountPhp,
          input.breakdown.minimumRequiredPhp,
          input.breakdown.employerFeePhp,
          input.breakdown.employerTotalChargePhp,
          input.breakdown.employeeFeePhp,
          input.breakdown.workerNetPayoutPhp,
          input.breakdown.platformRevenuePhp,
          input.breakdown.feeProtectedByMinimumWageFloor ? 1 : 0,
          createdAt,
        );

      const gig = this.getGigById(input.gigId) as GigRecord;
      const transaction: TransactionRecord = {
        id,
        gigId: input.gigId,
        employerId: input.employerId,
        employeeId: input.employeeId,
        ...input.breakdown,
        createdAt,
      };

      return { gig, transaction };
    });
  }

  listTransactionsForUser(userId: string): TransactionRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM transactions
         WHERE employer_id = ? OR employee_id = ?
         ORDER BY created_at DESC, rowid DESC`,
      )
      .all(userId, userId) as RawRow[];
    return rows.map(mapTransactionRow);
  }
}
