// Seeded, fictional Davao City data for the GAW demo. All people and businesses are invented.

export const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Cleaning",
  "Painting",
  "Handyman",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
export type Radius = (typeof RADIUS_OPTIONS)[number];

export interface Barangay {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Approximate area centers, used only to simulate distances in the demo.
export const BARANGAYS: Barangay[] = [
  { id: "poblacion", name: "Poblacion", lat: 7.0707, lng: 125.6087 },
  { id: "bajada", name: "Bajada", lat: 7.085, lng: 125.61 },
  { id: "buhangin", name: "Buhangin", lat: 7.108, lng: 125.615 },
  { id: "lanang", name: "Lanang", lat: 7.105, lng: 125.64 },
  { id: "matina", name: "Matina", lat: 7.056, lng: 125.588 },
  { id: "talomo", name: "Talomo", lat: 7.04, lng: 125.57 },
  { id: "mintal", name: "Mintal", lat: 7.091, lng: 125.5 },
  { id: "toril", name: "Toril", lat: 7.018, lng: 125.498 },
];

export function barangayName(id: string) {
  return BARANGAYS.find((b) => b.id === id)?.name ?? id;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  when: string;
}

export interface Worker {
  id: string;
  name: string;
  initials: string;
  skill: Category;
  skills: string[];
  barangayId: string;
  lat: number;
  lng: number;
  /** Hourly rate in PHP. null = Request Quote. */
  rate: number | null;
  available: boolean;
  rating: number;
  jobsDone: number;
  years: number;
  bio: string;
  hours: string;
  reviews: Review[];
  portfolio: string[];
}

export const WORKERS: Worker[] = [
  {
    id: "w-ramon",
    name: "Ramon Dizon",
    initials: "RD",
    skill: "Plumbing",
    skills: ["Leak repair", "Pipe installation", "Water heater setup"],
    barangayId: "bajada",
    lat: 7.0862,
    lng: 125.6085,
    rate: 350,
    available: true,
    rating: 4.9,
    jobsDone: 128,
    years: 11,
    bio: "Licensed plumber serving north Davao. Fast response for leaks, clogged drains, and new bathroom fixtures. I bring my own tools and clean up after.",
    hours: "Mon–Sat, 7:00 AM – 6:00 PM",
    reviews: [
      {
        author: "Liza M.",
        rating: 5,
        text: "Fixed our kitchen leak within an hour. Very neat work.",
        when: "2 weeks ago",
      },
      {
        author: "Paolo R.",
        rating: 5,
        text: "Honest pricing and explained everything clearly.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Bathroom repiping", "Kitchen sink install", "Water heater setup"],
  },
  {
    id: "w-joy",
    name: "Joy Villanueva",
    initials: "JV",
    skill: "Cleaning",
    skills: ["Deep cleaning", "Move-out cleaning", "Office cleaning"],
    barangayId: "matina",
    lat: 7.0575,
    lng: 125.5902,
    rate: 250,
    available: true,
    rating: 4.8,
    jobsDone: 214,
    years: 6,
    bio: "Detail-focused home and office cleaning. Eco-friendly supplies available on request. Small team of two for larger homes.",
    hours: "Daily, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Grace T.",
        rating: 5,
        text: "Our condo has never looked this clean!",
        when: "1 week ago",
      },
      {
        author: "Ben A.",
        rating: 4,
        text: "Thorough and on time. Will book again.",
        when: "3 weeks ago",
      },
    ],
    portfolio: ["Condo deep clean", "Office turnover", "Post-renovation clean"],
  },
  {
    id: "w-arnel",
    name: "Arnel Bautista",
    initials: "AB",
    skill: "Electrical",
    skills: ["Wiring", "Outlet & switch repair", "Lighting installation"],
    barangayId: "buhangin",
    lat: 7.1065,
    lng: 125.6172,
    rate: 450,
    available: false,
    rating: 4.9,
    jobsDone: 96,
    years: 14,
    bio: "Electrician with 14 years of residential and small-business experience. Safety-first, with clear quotes before work starts.",
    hours: "Mon–Fri, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Carmela D.",
        rating: 5,
        text: "Rewired our sari-sari store safely and quickly.",
        when: "5 days ago",
      },
      {
        author: "Jun P.",
        rating: 5,
        text: "Very professional and knowledgeable.",
        when: "2 months ago",
      },
    ],
    portfolio: ["Store rewiring", "LED lighting upgrade", "Breaker panel repair"],
  },
  {
    id: "w-lito",
    name: "Lito Mangubat",
    initials: "LM",
    skill: "Carpentry",
    skills: ["Cabinet making", "Door & window repair", "Furniture"],
    barangayId: "toril",
    lat: 7.0195,
    lng: 125.4995,
    rate: null,
    available: true,
    rating: 4.7,
    jobsDone: 73,
    years: 18,
    bio: "Custom cabinets, shelves, and furniture repair using local hardwood. Quotes depend on materials, so request one and I'll visit.",
    hours: "Mon–Sat, 7:00 AM – 4:00 PM",
    reviews: [
      {
        author: "Nena S.",
        rating: 5,
        text: "Beautiful kitchen cabinets, solid build.",
        when: "3 weeks ago",
      },
      {
        author: "Marco L.",
        rating: 4,
        text: "Great craftsmanship, slightly delayed due to rain.",
        when: "2 months ago",
      },
    ],
    portfolio: ["Narra kitchen cabinets", "Built-in bookshelf", "Wooden gate repair"],
  },
  {
    id: "w-cherry",
    name: "Cherry Abellana",
    initials: "CA",
    skill: "Painting",
    skills: ["Interior painting", "Exterior painting", "Wall repair"],
    barangayId: "lanang",
    lat: 7.1035,
    lng: 125.6385,
    rate: 300,
    available: true,
    rating: 4.8,
    jobsDone: 88,
    years: 8,
    bio: "Interior and exterior painting with careful prep work: masking, patching, and two-coat finish. Color advice included.",
    hours: "Mon–Sat, 8:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Rico V.",
        rating: 5,
        text: "Clean lines and zero mess. Highly recommended.",
        when: "1 week ago",
      },
      {
        author: "Ana C.",
        rating: 5,
        text: "Helped us pick the perfect color for our café.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Café accent wall", "Two-storey exterior", "Bedroom refresh"],
  },
  {
    id: "w-dodong",
    name: "Dodong Saldaña",
    initials: "DS",
    skill: "Handyman",
    skills: ["General repairs", "Furniture assembly", "Gutter cleaning"],
    barangayId: "poblacion",
    lat: 7.0718,
    lng: 125.6102,
    rate: 280,
    available: true,
    rating: 4.6,
    jobsDone: 159,
    years: 9,
    bio: "Your go-to for the small jobs that pile up: shelves, fixtures, leaky faucets, and furniture assembly. Same-day visits when available.",
    hours: "Daily, 7:00 AM – 7:00 PM",
    reviews: [
      {
        author: "Tess G.",
        rating: 5,
        text: "Assembled all our furniture in one afternoon.",
        when: "4 days ago",
      },
      { author: "Kim B.", rating: 4, text: "Friendly and reliable.", when: "3 weeks ago" },
    ],
    portfolio: ["Wardrobe assembly", "Shelf mounting", "Screen door repair"],
  },
  {
    id: "w-marites",
    name: "Marites Cabrera",
    initials: "MC",
    skill: "Cleaning",
    skills: ["Laundry & ironing", "Regular housekeeping", "Aircon cleaning"],
    barangayId: "buhangin",
    lat: 7.1102,
    lng: 125.6128,
    rate: 220,
    available: false,
    rating: 4.7,
    jobsDone: 141,
    years: 7,
    bio: "Weekly housekeeping, laundry, and aircon filter cleaning. Trusted by many families around Buhangin.",
    hours: "Tue–Sun, 8:00 AM – 4:00 PM",
    reviews: [
      {
        author: "Fe R.",
        rating: 5,
        text: "Very trustworthy, our go-to every Saturday.",
        when: "2 weeks ago",
      },
      { author: "Leo M.", rating: 4, text: "Good work and polite.", when: "1 month ago" },
    ],
    portfolio: ["Weekly housekeeping", "Aircon filter cleaning", "Laundry service"],
  },
  {
    id: "w-jerome",
    name: "Jerome Alcantara",
    initials: "JA",
    skill: "Electrical",
    skills: ["Solar panel setup", "CCTV installation", "Wiring"],
    barangayId: "matina",
    lat: 7.0548,
    lng: 125.5861,
    rate: null,
    available: true,
    rating: 4.8,
    jobsDone: 52,
    years: 5,
    bio: "Young electrician specializing in solar setups and CCTV for homes and small shops. Free assessment for solar quotes.",
    hours: "Mon–Sat, 8:00 AM – 6:00 PM",
    reviews: [
      {
        author: "Dennis Y.",
        rating: 5,
        text: "Solar setup has cut our bill in half.",
        when: "1 month ago",
      },
      {
        author: "Joan F.",
        rating: 5,
        text: "Clean CCTV install, explained the app well.",
        when: "2 months ago",
      },
    ],
    portfolio: ["Rooftop solar kit", "Shop CCTV", "Outdoor lighting"],
  },
  {
    id: "w-noel",
    name: "Noel Ybañez",
    initials: "NY",
    skill: "Plumbing",
    skills: ["Drain unclogging", "Septic concerns", "Faucet replacement"],
    barangayId: "mintal",
    lat: 7.0925,
    lng: 125.5018,
    rate: 320,
    available: true,
    rating: 4.5,
    jobsDone: 64,
    years: 10,
    bio: "Serving Mintal, Tugbok, and nearby areas. Drain and faucet problems fixed with clear upfront pricing.",
    hours: "Mon–Sat, 7:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Rowena P.",
        rating: 5,
        text: "Came quickly even in the rain.",
        when: "1 week ago",
      },
      {
        author: "Allan C.",
        rating: 4,
        text: "Solved our drain problem for good.",
        when: "1 month ago",
      },
    ],
    portfolio: ["Drain line clearing", "Faucet replacement", "Outdoor tap install"],
  },
  {
    id: "w-bong",
    name: "Bong Esteban",
    initials: "BE",
    skill: "Carpentry",
    skills: ["Roof repair", "Ceiling installation", "Deck building"],
    barangayId: "talomo",
    lat: 7.0412,
    lng: 125.5725,
    rate: 380,
    available: true,
    rating: 4.7,
    jobsDone: 81,
    years: 12,
    bio: "Roofing, ceilings, and outdoor decks. Rainy-season leak repairs are my specialty.",
    hours: "Mon–Sat, 7:00 AM – 5:00 PM",
    reviews: [
      {
        author: "Sheila O.",
        rating: 5,
        text: "No more roof leaks this rainy season!",
        when: "3 weeks ago",
      },
      { author: "Rey D.", rating: 4, text: "Solid work on our ceiling.", when: "2 months ago" },
    ],
    portfolio: ["Roof leak repair", "Gypsum ceiling", "Garden deck"],
  },
  {
    id: "w-lorna",
    name: "Lorna Pacquiao",
    initials: "LP",
    skill: "Painting",
    skills: ["Gate & grill painting", "Waterproofing", "Interior painting"],
    barangayId: "toril",
    lat: 7.0168,
    lng: 125.4962,
    rate: 270,
    available: false,
    rating: 4.6,
    jobsDone: 47,
    years: 6,
    bio: "Gates, grills, and waterproof coatings that last through Davao's rainy months.",
    hours: "Mon–Fri, 8:00 AM – 5:00 PM",
    reviews: [
      { author: "Edwin T.", rating: 5, text: "Our gate looks brand new.", when: "2 weeks ago" },
      { author: "Mylene A.", rating: 4, text: "Good waterproofing job.", when: "2 months ago" },
    ],
    portfolio: ["Steel gate repaint", "Roof waterproofing", "Living room repaint"],
  },
  {
    id: "w-kiko",
    name: "Kiko Larrazabal",
    initials: "KL",
    skill: "Handyman",
    skills: ["TV mounting", "Curtain rods", "Minor plumbing"],
    barangayId: "lanang",
    lat: 7.1068,
    lng: 125.6421,
    rate: 300,
    available: true,
    rating: 4.8,
    jobsDone: 110,
    years: 7,
    bio: "Mounting, hanging, fixing, and assembling — tidy work for condos and homes around Lanang and Damosa.",
    hours: "Daily, 9:00 AM – 7:00 PM",
    reviews: [
      {
        author: "Bianca L.",
        rating: 5,
        text: "Mounted our TV perfectly level.",
        when: "6 days ago",
      },
      { author: "Oscar N.", rating: 5, text: "Quick and courteous.", when: "1 month ago" },
    ],
    portfolio: ["TV wall mount", "Curtain rod install", "Condo fixture swap"],
  },
];

export interface Job {
  id: string;
  title: string;
  category: Category;
  barangayId: string;
  landmark: string;
  lat: number;
  lng: number;
  poster: string;
  budget: string;
  budgetNum: number;
  estimatedHours: number;
  minimumRequiredPhp: number;
  aiRecommendedPhp: number;
  posted: string;
  schedule: string;
  description: string;
  urgent?: boolean;
}

export const DAVAO_DAILY_MIN_WAGE_PHP = 508;
export const DAVAO_HOURLY_MIN_WAGE_PHP = 63.5;

const CATEGORY_PRICE_MULTIPLIERS: Record<Category, number> = {
  Plumbing: 1.45,
  Electrical: 1.5,
  Carpentry: 1.4,
  Cleaning: 1.15,
  Painting: 1.3,
  Handyman: 1.25,
};

export function barangayById(id: string): Barangay {
  return BARANGAYS.find((b) => b.id === id) ?? BARANGAYS[0]!;
}

/** Resolve the closest Davao barangay and human-readable label for a live or simulated GPS pin. */
export function describeGpsLocation(
  lat: number,
  lng: number,
): { nearestBarangayId: string; label: string; inDavaoMetro: boolean } {
  let nearest = BARANGAYS[0]!;
  let minKm = Infinity;
  for (const b of BARANGAYS) {
    const km = calculateJobDistanceKm(lat, lng, b.lat, b.lng);
    if (km < minKm) {
      minKm = km;
      nearest = b;
    }
  }
  const inDavaoMetro = minKm <= 25;
  return {
    nearestBarangayId: nearest.id,
    label: inDavaoMetro
      ? `Live GPS · Near ${nearest.name}, Davao City`
      : `Live Device GPS (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
    inDavaoMetro,
  };
}

export function calculateJobDistanceKm(
  userLat: number,
  userLng: number,
  jobLat: number,
  jobLng: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(jobLat - userLat);
  const dLng = toRad(jobLng - userLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(jobLat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a));
  return Math.round(km * 100) / 100;
}

export function formatDistanceBadge(km: number): string {
  if (km < 1) {
    return `${Math.max(50, Math.round(km * 1000))} m away`;
  }
  return `${km.toFixed(1)} km away`;
}

export function estimateTravelMinutes(km: number): { rideMin: number; walkMin: number } {
  return {
    rideMin: Math.max(2, Math.round((km / 24) * 60)),
    walkMin: Math.max(3, Math.round((km / 4.8) * 60)),
  };
}

export function estimateDavaoJobPricing(
  category: Category,
  estimatedHours: number,
  urgent: boolean,
): { minimumRequiredPhp: number; aiRecommendedPhp: number; hourlyFloorPhp: number } {
  const safeHours = Math.max(1, estimatedHours);
  const minimumRequiredPhp = Math.round(safeHours * DAVAO_HOURLY_MIN_WAGE_PHP * 100) / 100;
  const mult = CATEGORY_PRICE_MULTIPLIERS[category] * (urgent ? 1.2 : 1.0);
  const rawRec = minimumRequiredPhp * mult * 1.45;
  const aiRecommendedPhp = Math.max(Math.ceil(minimumRequiredPhp), Math.round(rawRec / 50) * 50);
  return {
    minimumRequiredPhp,
    aiRecommendedPhp,
    hourlyFloorPhp: DAVAO_HOURLY_MIN_WAGE_PHP,
  };
}

export function calculateWorkerNetPayout(
  grossPhp: number,
  estimatedHours: number,
  isPro: boolean,
): { feePhp: number; netPayoutPhp: number; feeProtectedByMinWage: boolean } {
  const floor = Math.round(Math.max(1, estimatedHours) * DAVAO_HOURLY_MIN_WAGE_PHP * 100) / 100;
  if (isPro) {
    return { feePhp: 0, netPayoutPhp: grossPhp, feeProtectedByMinWage: false };
  }
  const idealFee = Math.round(grossPhp * 0.05 * 100) / 100;
  const maxDeductibleFee = Math.max(0, Math.round((grossPhp - floor) * 100) / 100);
  const feePhp = Math.min(idealFee, maxDeductibleFee);
  return {
    feePhp,
    netPayoutPhp: Math.round((grossPhp - feePhp) * 100) / 100,
    feeProtectedByMinWage: feePhp < idealFee,
  };
}

/** Davao City side-job commute & walk GPS simulation waypoints along Bajada -> Poblacion -> Matina -> Lanang. */
export const DAVAO_GPS_ROUTE_WAYPOINTS: ReadonlyArray<{ label: string; lat: number; lng: number }> =
  [
    { label: "J.P. Laurel Ave near Abreeza, Bajada", lat: 7.0862, lng: 125.6114 },
    { label: "Gmall Bajada Flyover", lat: 7.0792, lng: 125.6119 },
    { label: "Roxas Night Market Ave, Poblacion", lat: 7.0731, lng: 125.6126 },
    { label: "San Pedro St. City Hall, Poblacion", lat: 7.0644, lng: 125.6081 },
    { label: "Bankerohan Bridge Approach", lat: 7.0685, lng: 125.5998 },
    { label: "Matina Crossing (SM Ecoland area)", lat: 7.0558, lng: 125.5912 },
    { label: "Quimpo Blvd / Talomo edge", lat: 7.0485, lng: 125.5818 },
    { label: "Quirino Ave near Davao Doc", lat: 7.0707, lng: 125.6032 },
    { label: "Damosa Gateway, Lanang", lat: 7.0972, lng: 125.6305 },
    { label: "Milan Intersection, Buhangin", lat: 7.1088, lng: 125.6164 },
  ];

export const JOBS: Job[] = [
  {
    id: "j-1",
    title: "Fix leaking bathroom faucet & trap",
    category: "Plumbing",
    barangayId: "bajada",
    landmark: "Near Abreeza Mall, J.P. Laurel Ave",
    lat: 7.0894,
    lng: 125.6138,
    poster: "Marco Villanueva",
    budget: "₱850",
    budgetNum: 850,
    estimatedHours: 3,
    minimumRequiredPhp: 190.5,
    aiRecommendedPhp: 550,
    posted: "45m ago",
    schedule: "Today, ASAP",
    description:
      "Water drips underneath the sink trap whenever the faucet runs. Tools appreciated; spare P-trap ready on site.",
    urgent: true,
  },
  {
    id: "j-2",
    title: "Install 3 ceiling fans & 2 duplex outlets",
    category: "Electrical",
    barangayId: "matina",
    landmark: "Matina Crossing near SM City Ecoland",
    lat: 7.0561,
    lng: 125.5869,
    poster: "Elena Santos",
    budget: "₱1,500",
    budgetNum: 1500,
    estimatedHours: 5,
    minimumRequiredPhp: 317.5,
    aiRecommendedPhp: 700,
    posted: "2h ago",
    schedule: "Tomorrow morning",
    description:
      "New ceiling fans and wall outlets already bought, just need clean wiring, mounting, and load test.",
  },
  {
    id: "j-3",
    title: "Deep clean 2-bedroom condo unit",
    category: "Cleaning",
    barangayId: "lanang",
    landmark: "Damosa / SM Lanang Premier condo",
    lat: 7.1018,
    lng: 125.6378,
    poster: "Sofia Lim",
    budget: "₱1,200",
    budgetNum: 1200,
    estimatedHours: 6,
    minimumRequiredPhp: 381,
    aiRecommendedPhp: 650,
    posted: "3h ago",
    schedule: "Saturday",
    description:
      "Move-out cleaning: kitchen grease wipe-down, toilet scrubbing, glass sliding doors, and mop.",
    urgent: true,
  },
  {
    id: "j-4",
    title: "Build kitchen under-sink cabinet door",
    category: "Carpentry",
    barangayId: "buhangin",
    landmark: "Milan crossing, Buhangin Proper",
    lat: 7.1095,
    lng: 125.6172,
    poster: "Mark Ocampo",
    budget: "₱1,000",
    budgetNum: 1000,
    estimatedHours: 4,
    minimumRequiredPhp: 254,
    aiRecommendedPhp: 550,
    posted: "5h ago",
    schedule: "Flexible",
    description:
      "One wooden door came off with a rusted hinge and needs replacement marine plywood trim.",
  },
  {
    id: "j-5",
    title: "Repaint small café interior walls",
    category: "Painting",
    barangayId: "poblacion",
    landmark: "Quirino Ave near Bankerohan",
    lat: 7.0688,
    lng: 125.6054,
    poster: "Kapehan sa Bangkerohan",
    budget: "₱2,500",
    budgetNum: 2500,
    estimatedHours: 8,
    minimumRequiredPhp: 508,
    aiRecommendedPhp: 1000,
    posted: "5h ago",
    schedule: "Next weekend",
    description: "About 40 sqm dining area. Paint and rollers provided; need prep and two coats.",
  },
  {
    id: "j-6",
    title: 'Assemble wardrobe + wall mount 55" TV',
    category: "Handyman",
    barangayId: "talomo",
    landmark: "McArthur Hwy, Bangkal / Talomo",
    lat: 7.0436,
    lng: 125.5734,
    poster: "BrightPath Learning",
    budget: "₱950",
    budgetNum: 950,
    estimatedHours: 4,
    minimumRequiredPhp: 254,
    aiRecommendedPhp: 550,
    posted: "6h ago",
    schedule: "Tomorrow",
    description: "Medium flat-pack wardrobe and 55-inch TV bracket installation. Drill preferred.",
    urgent: true,
  },
  {
    id: "j-7",
    title: "Replace gate latch and align steel hinge",
    category: "Handyman",
    barangayId: "toril",
    landmark: "Near Toril Public Market road",
    lat: 7.0202,
    lng: 125.4995,
    poster: "Aling Nora's Store",
    budget: "₱750",
    budgetNum: 750,
    estimatedHours: 3,
    minimumRequiredPhp: 190.5,
    aiRecommendedPhp: 400,
    posted: "1d ago",
    schedule: "Within 3 days",
    description:
      "Front steel gate is dragging on the driveway; needs alignment and heavy-duty latch.",
  },
  {
    id: "j-8",
    title: "Rewire outdoor security floodlights",
    category: "Electrical",
    barangayId: "mintal",
    landmark: "UP Mindanao access road, Mintal",
    lat: 7.0898,
    lng: 125.5024,
    poster: "Ricardo Uy",
    budget: "₱1,100",
    budgetNum: 1100,
    estimatedHours: 4,
    minimumRequiredPhp: 254,
    aiRecommendedPhp: 650,
    posted: "30m ago",
    schedule: "Today",
    description: "Install two weatherproof LED floodlights for sari-sari store frontage.",
    urgent: true,
  },
  {
    id: "j-9",
    title: "Clear clogged café grease trap & drain",
    category: "Plumbing",
    barangayId: "poblacion",
    landmark: "Roxas Avenue near Ateneo",
    lat: 7.0734,
    lng: 125.6129,
    poster: "Roxas Brew House",
    budget: "₱950",
    budgetNum: 950,
    estimatedHours: 3,
    minimumRequiredPhp: 190.5,
    aiRecommendedPhp: 550,
    posted: "1h ago",
    schedule: "Early morning",
    description:
      "Clear slow kitchen floor drain and clean under-counter grease trap before opening.",
    urgent: true,
  },
  {
    id: "j-10",
    title: "Sari-sari store wooden awning repair",
    category: "Carpentry",
    barangayId: "poblacion",
    landmark: "San Pedro St. near City Hall",
    lat: 7.0644,
    lng: 125.6075,
    poster: "Tita Lorna Merch",
    budget: "₱900",
    budgetNum: 900,
    estimatedHours: 4,
    minimumRequiredPhp: 254,
    aiRecommendedPhp: 500,
    posted: "4h ago",
    schedule: "This week",
    description: "Reinforce timber awning support and replace two corrugated sheets.",
  },
  {
    id: "j-11",
    title: "Clinic frontage glass & signage wash",
    category: "Cleaning",
    barangayId: "lanang",
    landmark: "Damosa IT Park vicinity, Lanang",
    lat: 7.0972,
    lng: 125.6305,
    poster: "Damosa Smile Clinic",
    budget: "₱720",
    budgetNum: 720,
    estimatedHours: 4,
    minimumRequiredPhp: 254,
    aiRecommendedPhp: 450,
    posted: "1d ago",
    schedule: "Recurring Saturdays",
    description: "Glass window squeegee polish and exterior walkway broom & pressure rinse.",
  },
  {
    id: "j-12",
    title: "Exterior fence anti-rust repainting",
    category: "Painting",
    barangayId: "buhangin",
    landmark: "Diversion Rd / Buhangin Cabantian junction",
    lat: 7.1142,
    lng: 125.6208,
    poster: "The Garcia Family",
    budget: "₱1,850",
    budgetNum: 1850,
    estimatedHours: 7,
    minimumRequiredPhp: 444.5,
    aiRecommendedPhp: 850,
    posted: "2d ago",
    schedule: "Sunday",
    description:
      "Wire-brush light rust, apply red oxide primer and charcoal enamel along 10m fence.",
  },
];

/** Fictional demo residents who send booking requests to the user's worker profile. */
export const DEMO_PERSONAS = [
  { name: "Maria Santos", initials: "MS" },
  { name: "Carlo Reyes", initials: "CR" },
  { name: "Ana Dimaculangan", initials: "AD" },
] as const;
