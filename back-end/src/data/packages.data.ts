/**
 * Package trips seed data
 * Source: front-end/JS/mockData.js → DB.packageTrips
 */
export interface Package {
  packageId: number;
  name: string;
  duration: number;
  budget: number;
  description: string;
  destinations: string;
  highlights: string;
  image: string;
}

export const packages: Package[] = [
  { packageId: 1, name: 'Paris Deluxe', duration: 7, budget: 145000, description: 'Explore the City of Light with guided tours, luxury stays, and Seine cruises.', destinations: 'Paris', highlights: 'Eiffel Tower, Louvre, Montmartre', image: '../static/destinations/paris.png' },
  { packageId: 2, name: 'Tokyo Explorer', duration: 10, budget: 195000, description: "Discover Japan's vibrant capital — temples, street food, and neon nights.", destinations: 'Tokyo, Kyoto', highlights: 'Shibuya, Senso-ji, Mt. Fuji day trip', image: '../static/destinations/tokyo.png' },
  { packageId: 3, name: 'Swiss Alps Adventure', duration: 7, budget: 165000, description: 'Mountain trails, scenic trains, and alpine lakes in breathtaking Switzerland.', destinations: 'Zurich, Interlaken, Zermatt', highlights: 'Jungfraujoch, Glacier Express, Lake Geneva', image: '../static/destinations/swiss_alps.png' },
  { packageId: 4, name: 'Bali Bliss Retreat', duration: 6, budget: 75000, description: 'Tropical paradise with rice terraces, temples, and stunning sunsets.', destinations: 'Ubud, Seminyak, Nusa Dua', highlights: 'Tegallalang, Uluwatu Temple, Snorkeling', image: '../static/destinations/bali.png' },
  { packageId: 5, name: 'New York City Rush', duration: 5, budget: 155000, description: 'The Big Apple — Broadway, Central Park, and world-class dining.', destinations: 'New York', highlights: 'Times Square, Statue of Liberty, Brooklyn Bridge', image: '../static/destinations/new_york.png' },
  { packageId: 6, name: 'Dubai Luxury Escape', duration: 5, budget: 215000, description: 'Desert safaris, skyscrapers, and opulent shopping in the UAE.', destinations: 'Dubai, Abu Dhabi', highlights: 'Burj Khalifa, Desert Safari, Palm Jumeirah', image: '../static/destinations/dubai.png' },
  { packageId: 7, name: 'Goa Beach Getaway', duration: 4, budget: 12000, description: "Sun, sand, and seafood on India's most beloved coastline.", destinations: 'North Goa, South Goa', highlights: 'Baga Beach, Fort Aguada, Dudhsagar Falls', image: '../static/destinations/goa.png' },
  { packageId: 8, name: 'Kerala Backwaters', duration: 5, budget: 16500, description: 'Houseboat cruise through serene backwaters and lush hill stations.', destinations: 'Alleppey, Munnar, Kochi', highlights: 'Houseboat, Tea Plantations, Kathakali Show', image: '../static/destinations/kerala.png' },
  { packageId: 9, name: 'Singapore & Malaysia', duration: 8, budget: 135000, description: 'Two countries, one incredible trip — modern cities meet tropical charm.', destinations: 'Singapore, Kuala Lumpur, Langkawi', highlights: 'Marina Bay, Petronas Towers, Island Hopping', image: '../static/destinations/singapore.png' },
  { packageId: 10, name: 'Rajasthan Royal Tour', duration: 9, budget: 22000, description: "Forts, palaces, and vibrant culture across India's royal state.", destinations: 'Jaipur, Udaipur, Jodhpur, Jaisalmer', highlights: 'Amber Fort, Lake Pichola, Desert Camp', image: '../static/destinations/rajasthan.png' },
];
