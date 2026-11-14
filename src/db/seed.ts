import { didFollowAiRecommendation, estimateGigPrice } from '../domain/pricing-advisor.js';
import { validateGigPrice } from '../domain/wage-policy.js';
import type { CreateGigInput, CreateUserInput, GawRepository } from './repository.js';

export interface SeedResult {
  usersSeeded: number;
  gigsSeeded: number;
}

export const DAVAO_SEED_USERS: ReadonlyArray<CreateUserInput & { id: string }> = [
  {
    id: 'emp-homeowner-bajada',
    name: 'Marco Villanueva',
    role: 'employer',
    tier: 'PRO',
    barangay: 'Bajada (J.P. Laurel)',
    lat: 7.0862,
    lng: 125.6114,
  },
  {
    id: 'emp-abreeza-biz',
    name: 'Davao Fresh Mart — Poblacion',
    role: 'employer',
    tier: 'PRO',
    barangay: 'Poblacion District',
    lat: 7.0715,
    lng: 125.6089,
  },
  {
    id: 'emp-matina-resident',
    name: 'Elena Santos — Matina Crossing',
    role: 'employer',
    tier: 'FREE',
    barangay: 'Matina',
    lat: 7.0568,
    lng: 125.5875,
  },
  {
    id: 'w-ramon',
    name: 'Ramon Dela Cruz',
    role: 'employee',
    tier: 'FREE',
    barangay: 'Poblacion District',
    lat: 7.0707,
    lng: 125.6087,
  },
  {
    id: 'w-joy',
    name: 'Joy Magsaysay',
    role: 'employee',
    tier: 'PRO',
    barangay: 'Bajada (J.P. Laurel)',
    lat: 7.0842,
    lng: 125.6122,
  },
  {
    id: 'w-arnel',
    name: 'Arnel Bautista',
    role: 'employee',
    tier: 'FREE',
    barangay: 'Lanang',
    lat: 7.1038,
    lng: 125.6362,
  },
];

export type SeedGigSpec = Omit<
  CreateGigInput,
  'minimumRequiredPhp' | 'aiRecommendedPhp' | 'followedAiRecommendation'
> & { id: string };

export const DAVAO_SEED_GIGS: ReadonlyArray<SeedGigSpec> = [
  {
    id: 'j-1',
    employerId: 'emp-homeowner-bajada',
    title: 'Fix leaking bathroom sink & trap',
    description:
      'Water drips underneath when the tap is turned on. Needed today if possible near Abreeza.',
    category: 'plumbing',
    estimatedHours: 3,
    offeredPricePhp: 850,
    urgency: 'urgent',
    barangay: 'Bajada (J.P. Laurel)',
    lat: 7.0894,
    lng: 125.6138,
  },
  {
    id: 'j-2',
    employerId: 'emp-matina-resident',
    title: 'Install 3 ceiling fans & 2 duplex outlets',
    description:
      'New ceiling fans and wall outlets already bought, just need safe installation and load testing.',
    category: 'electrical',
    estimatedHours: 5,
    offeredPricePhp: 1500,
    urgency: 'standard',
    barangay: 'Matina',
    lat: 7.0561,
    lng: 125.5869,
  },
  {
    id: 'j-3',
    employerId: 'emp-abreeza-biz',
    title: 'Deep clean 2-bedroom condo unit',
    description:
      'Move-out cleaning: kitchen grease wipe-down, toilet scrubbing, glass sliding doors, and mop.',
    category: 'cleaning',
    estimatedHours: 6,
    offeredPricePhp: 1200,
    urgency: 'standard',
    barangay: 'Lanang',
    lat: 7.1018,
    lng: 125.6378,
  },
  {
    id: 'j-4',
    employerId: 'emp-homeowner-bajada',
    title: 'Build kitchen under-sink cabinet door',
    description:
      'One wooden door came off with a rusted hinge and needs replacement plywood trim.',
    category: 'carpentry',
    estimatedHours: 4,
    offeredPricePhp: 1000,
    urgency: 'standard',
    barangay: 'Buhangin',
    lat: 7.1095,
    lng: 125.6172,
  },
  {
    id: 'j-5',
    employerId: 'emp-abreeza-biz',
    title: 'Repaint bedroom & accent wall',
    description:
      '12 sqm room along Quirino Ave, white base coat and pale sage accent. Paint & rollers provided.',
    category: 'painting',
    estimatedHours: 8,
    offeredPricePhp: 2500,
    urgency: 'standard',
    barangay: 'Poblacion District',
    lat: 7.0688,
    lng: 125.6054,
  },
  {
    id: 'j-6',
    employerId: 'emp-homeowner-bajada',
    title: 'Assemble flat-pack wardrobe + wall mount TV',
    description:
      'Medium wardrobe with sliding doors and 55-inch TV bracket near Bangkal / Talomo crossing.',
    category: 'handyman',
    estimatedHours: 4,
    offeredPricePhp: 950,
    urgency: 'urgent',
    barangay: 'Talomo',
    lat: 7.0436,
    lng: 125.5734,
  },
  {
    id: 'j-7',
    employerId: 'emp-homeowner-bajada',
    title: 'Replace gate latch and weld rusted hinge',
    description:
      'Front steel gate is dragging on the driveway near Toril public market road.',
    category: 'handyman',
    estimatedHours: 3,
    offeredPricePhp: 750,
    urgency: 'standard',
    barangay: 'Toril',
    lat: 7.0202,
    lng: 125.4995,
  },
  {
    id: 'j-8',
    employerId: 'emp-abreeza-biz',
    title: 'Rewire outdoor security floodlights',
    description:
      'Two weatherproof LED floodlights near the sari-sari frontage & UP Mindanao access road.',
    category: 'electrical',
    estimatedHours: 4,
    offeredPricePhp: 1100,
    urgency: 'urgent',
    barangay: 'Mintal',
    lat: 7.0898,
    lng: 125.5024,
  },
  {
    id: 'j-9',
    employerId: 'emp-abreeza-biz',
    title: 'Clear clogged grease trap & café drain line',
    description:
      'Early morning cleaning before opening hours along Roxas Avenue, Poblacion.',
    category: 'plumbing',
    estimatedHours: 3,
    offeredPricePhp: 950,
    urgency: 'urgent',
    barangay: 'Poblacion District',
    lat: 7.0734,
    lng: 125.6129,
  },
  {
    id: 'j-10',
    employerId: 'emp-homeowner-bajada',
    title: 'San Pedro sari-sari awning frame repair',
    description:
      'Reinforce bamboo & light lumber awning support after heavy Davao evening rain.',
    category: 'carpentry',
    estimatedHours: 4,
    offeredPricePhp: 900,
    urgency: 'standard',
    barangay: 'Poblacion District',
    lat: 7.0644,
    lng: 125.6075,
  },
  {
    id: 'j-11',
    employerId: 'emp-homeowner-bajada',
    title: 'Storefront glass & signage wash (SM Lanang area)',
    description:
      'Weekly exterior pressure wash and glass polish for clinic frontage along Damosa.',
    category: 'cleaning',
    estimatedHours: 4,
    offeredPricePhp: 720,
    urgency: 'standard',
    barangay: 'Lanang',
    lat: 7.0972,
    lng: 125.6305,
  },
  {
    id: 'j-12',
    employerId: 'emp-homeowner-bajada',
    title: 'Exterior gate & fence anti-rust repainting',
    description:
      'Steel primer + charcoal topcoat for 10-meter residential fence along Milan, Buhangin.',
    category: 'painting',
    estimatedHours: 7,
    offeredPricePhp: 1850,
    urgency: 'standard',
    barangay: 'Buhangin',
    lat: 7.1142,
    lng: 125.6208,
  },
];

/**
 * Idempotently populates a GAW SQLite repository with Davao City demo employers, workers,
 * minimum-wage-compliant gigs, and initial saved gigs.
 */
export function seedDemoMarketplace(repo: GawRepository): SeedResult {
  return repo.runInTransaction(() => {
    let usersSeeded = 0;
    let gigsSeeded = 0;

    for (const user of DAVAO_SEED_USERS) {
      if (!repo.getUserById(user.id)) {
        repo.createUser(user);
        usersSeeded += 1;
      }
    }

    for (const gig of DAVAO_SEED_GIGS) {
      if (!repo.getGigById(gig.id)) {
        const wage = validateGigPrice(gig.estimatedHours, gig.offeredPricePhp);
        const advice = estimateGigPrice({
          category: gig.category,
          estimatedHours: gig.estimatedHours,
          urgency: gig.urgency,
          requiredSkills: [],
        });

        repo.createGig({
          ...gig,
          minimumRequiredPhp: wage.minimumRequiredPhp,
          aiRecommendedPhp: advice.recommendedPhp,
          followedAiRecommendation: didFollowAiRecommendation(
            wage.offeredPricePhp,
            advice.suggestedMinPhp,
            advice.suggestedMaxPhp,
          ),
        });
        gigsSeeded += 1;
      }
    }

    if (!repo.hasSavedGig('w-ramon', 'j-1')) {
      repo.saveGigForEmployee({
        employeeId: 'w-ramon',
        gigId: 'j-1',
        note: 'Quick morning plumbing fix near Abreeza',
      });
    }

    return { usersSeeded, gigsSeeded };
  });
}
