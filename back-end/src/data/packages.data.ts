export interface Package {
  packageId: number;
  name: string;
  duration: number;
  budget: number;
  description: string;
  destinations: string;
  highlights: string;
  image: string;
  agencyId?: number;
  isFeatured?: boolean;
  status?: string;
  archivedAt?: string;
  archivedReason?: string;
  archivedBy?: number;
}

export const packages: Package[] = [
  {
    packageId: 1,
    name: 'Paris Deluxe',
    duration: 7,
    budget: 145000,
    description: 'Explore the City of Light with guided tours, luxury stays, and Seine cruises.',
    destinations: 'Paris',
    highlights: 'Eiffel Tower, Louvre Museum, Montmartre, Seine Cruise',
    image: '/destinations/paris.png',
    agencyId: 1,
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    packageId: 2,
    name: 'Tokyo Explorer',
    duration: 10,
    budget: 195000,
    description: 'Discover Japan\'s vibrant capital — ancient temples, street food, and neon nights.',
    destinations: 'Tokyo, Kyoto',
    highlights: 'Shibuya Crossing, Senso-ji Temple, Mt. Fuji Day Trip, Shinkansen Bullet Train',
    image: '/destinations/tokyo.png',
    agencyId: 1,
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    packageId: 3,
    name: 'Swiss Alps Adventure',
    duration: 7,
    budget: 165000,
    description: 'Mountain trails, scenic trains, and alpine lakes in breathtaking Switzerland.',
    destinations: 'Zurich, Interlaken, Zermatt',
    highlights: 'Jungfraujoch Top of Europe, Glacier Express, Lake Geneva, Matterhorn Trek',
    image: '/destinations/swiss_alps.png',
    agencyId: 1,
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    packageId: 4,
    name: 'Bali Bliss Retreat',
    duration: 6,
    budget: 75000,
    description: 'Tropical paradise with emerald rice terraces, cliffside temples, and sunset cruises.',
    destinations: 'Ubud, Seminyak, Nusa Dua',
    highlights: 'Tegallalang Rice Terraces, Uluwatu Temple, Coral Reef Snorkeling, Balinese Spa',
    image: '/destinations/bali.png',
    agencyId: 1,
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    packageId: 5,
    name: 'New York City Rush',
    duration: 5,
    budget: 155000,
    description: 'The Big Apple — Broadway spectacles, Central Park walks, and world-class dining.',
    destinations: 'New York',
    highlights: 'Times Square, Statue of Liberty, Brooklyn Bridge, Broadway Show',
    image: '/destinations/new_york.png',
    agencyId: 1,
    isFeatured: false,
    status: 'ACTIVE',
  },
  {
    packageId: 6,
    name: 'Dubai Luxury Escape',
    duration: 5,
    budget: 215000,
    description: 'Desert safaris, futuristic skyscrapers, and opulent shopping in the Emirates.',
    destinations: 'Dubai, Abu Dhabi',
    highlights: 'Burj Khalifa Observation Deck, Red Dune Desert Safari, Palm Jumeirah, Sheikh Zayed Mosque',
    image: '/destinations/dubai.png',
    agencyId: 1,
    isFeatured: true,
    status: 'ACTIVE',
  },
  {
    packageId: 7,
    name: 'Goa Coastal Adventure',
    duration: 4,
    budget: 12000,
    description: 'Sun, golden sand, and vibrant coastal culture on India\'s most beloved shoreline.',
    destinations: 'North Goa, South Goa',
    highlights: 'Baga Beach, Fort Aguada, Dudhsagar Waterfalls, Sunset Cruise',
    image: '/destinations/goa.png',
    agencyId: 1,
    isFeatured: false,
    status: 'ACTIVE',
  },
  {
    packageId: 8,
    name: 'Kerala Backwaters & Hills',
    duration: 5,
    budget: 16500,
    description: 'Traditional houseboat cruise through serene backwaters and lush tea plantations.',
    destinations: 'Alleppey, Munnar, Kochi',
    highlights: 'Luxury Houseboat Cruise, Tea Gardens, Kathakali Performance, Spice Plantations',
    image: '/destinations/kerala.png',
    agencyId: 1,
    isFeatured: false,
    status: 'ACTIVE',
  },
  {
    packageId: 9,
    name: 'Singapore & Malaysia Gateway',
    duration: 8,
    budget: 135000,
    description: 'Two countries, one seamless journey — modern architecture meets tropical rainforests.',
    destinations: 'Singapore, Kuala Lumpur, Langkawi',
    highlights: 'Marina Bay Sands, Gardens by the Bay, Petronas Twin Towers, Island Hopping',
    image: '/destinations/singapore.png',
    agencyId: 1,
    isFeatured: false,
    status: 'ACTIVE',
  },
  {
    packageId: 10,
    name: 'Rajasthan Royal Heritage',
    duration: 9,
    budget: 22000,
    description: 'Grand forts, royal palaces, and desert camps across the land of Maharajas.',
    destinations: 'Jaipur, Udaipur, Jodhpur, Jaisalmer',
    highlights: 'Amber Fort, Lake Pichola Boat Ride, Mehrangarh Fort, Thar Desert Camp & Safari',
    image: '/destinations/rajasthan.png',
    agencyId: 1,
    isFeatured: true,
    status: 'ACTIVE',
  },
];
