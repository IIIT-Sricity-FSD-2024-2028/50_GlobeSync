// =========================
// GLOBESYNC MOCK DATA
// Matches SQL schema exactly
// =========================

const DB = {

  travelers: [
    { traveler_id: 1, name: "Ajith Kumar", phone: "9876543210", email: "ajith@example.com", gender: "Male", age: 28, password: "traveler123" },
    { traveler_id: 2, name: "Priya Sharma", phone: "9123456789", email: "priya@example.com", gender: "Female", age: 25, password: "traveler123" },
    { traveler_id: 3, name: "Rahul Verma", phone: "9988776655", email: "rahul@example.com", gender: "Male", age: 32, password: "traveler123" },
    { traveler_id: 4, name: "Jyotish Rakoti", phone: "9110587215", email: "jyotish@gmail.com", gender: "Male", age: 32, password: "jyotish123" }
  ],


  administrators: [
    { admin_id: 1, name: "Super Admin", email: "superadmin@ticp.com", password: "super123", role: "superuser" },
    { admin_id: 2, name: "Koushik Chowdary", email: "admin@ticp.com", password: "admin123", role: "admin" }, 
    { admin_id: 3, name: "Jyotish Rakoti", email: "jyotishA@gmail.com", password: "jyotishA123", role: "admin" }
  ],

  customerCare: [
    { care_id: 1, name: "Sarah Johnson", contact: "9001122334", email: "sarah.johnson@gmail.com", password: "support123", role: "support" },
    { care_id: 2, name: "Ravi Teja", contact: "9445566778", email: "ravi.teja@gmail.com", password: "support123", role: "support" }
  ],

  travelGuides: [
    { guide_id: 1, name: "Raju", languages: ["English", "Hindi", "French"], experience: 5, rating: 4.8, pricePerTrip: 5500, contact: "9876501234", admin_id: 1, email: "raju@gmail.com", password: "guide123", role: "guide" },
    { guide_id: 2, name: "Charan", languages: ["English", "Japanese", "Hindi"], experience: 8, rating: 4.5, pricePerTrip: 8500, contact: "9876509876", admin_id: 1, email: "charan@gmail.com", password: "guide123", role: "guide" },
    { guide_id: 3, name: "Anita", languages: ["English", "Spanish", "Hindi"], experience: 3, rating: 4.2, pricePerTrip: 5000, contact: "9871234567", admin_id: 2, email: "anita@gmail.com", password: "guide123", role: "guide" },
    { guide_id: 4, name: "Vikram", languages: ["English", "German", "Hindi"], experience: 12, rating: 4.9, pricePerTrip: 12000, contact: "9812345678", admin_id: 2, email: "vikram@gmail.com", password: "guide123", role: "guide" },
    { guide_id: 5, name: "Suresh", languages: ["English", "Hindi"], experience: 15, rating: 5.0, pricePerTrip: 15000, contact: "9900112233", admin_id: 3, email: "suresh@gmail.com", password: "guide123", role: "guide" }
  ],

  packageTrips: [
    { package_id: 1, name: "Paris Deluxe", duration: 7, budget: 145000, description: "Explore the City of Light with guided tours, luxury stays, and Seine cruises.", destinations: "Paris", highlights: "Eiffel Tower, Louvre, Montmartre", image: "../static/destinations/paris.png" },
    { package_id: 2, name: "Tokyo Explorer", duration: 10, budget: 195000, description: "Discover Japan's vibrant capital — temples, street food, and neon nights.", destinations: "Tokyo, Kyoto", highlights: "Shibuya, Senso-ji, Mt. Fuji day trip", image: "../static/destinations/tokyo.png" },
    { package_id: 3, name: "Swiss Alps Adventure", duration: 7, budget: 165000, description: "Mountain trails, scenic trains, and alpine lakes in breathtaking Switzerland.", destinations: "Zurich, Interlaken, Zermatt", highlights: "Jungfraujoch, Glacier Express, Lake Geneva", image: "../static/destinations/swiss_alps.png" },
    { package_id: 4, name: "Bali Bliss Retreat", duration: 6, budget: 75000, description: "Tropical paradise with rice terraces, temples, and stunning sunsets.", destinations: "Ubud, Seminyak, Nusa Dua", highlights: "Tegallalang, Uluwatu Temple, Snorkeling", image: "../static/destinations/bali.png" },
    { package_id: 5, name: "New York City Rush", duration: 5, budget: 155000, description: "The Big Apple — Broadway, Central Park, and world-class dining.", destinations: "New York", highlights: "Times Square, Statue of Liberty, Brooklyn Bridge", image: "../static/destinations/new_york.png" },
    { package_id: 6, name: "Dubai Luxury Escape", duration: 5, budget: 215000, description: "Desert safaris, skyscrapers, and opulent shopping in the UAE.", destinations: "Dubai, Abu Dhabi", highlights: "Burj Khalifa, Desert Safari, Palm Jumeirah", image: "../static/destinations/dubai.png" },
    { package_id: 7, name: "Goa Beach Getaway", duration: 4, budget: 12000, description: "Sun, sand, and seafood on India's most beloved coastline.", destinations: "North Goa, South Goa", highlights: "Baga Beach, Fort Aguada, Dudhsagar Falls", image: "../static/destinations/goa.png" },
    { package_id: 8, name: "Kerala Backwaters", duration: 5, budget: 16500, description: "Houseboat cruise through serene backwaters and lush hill stations.", destinations: "Alleppey, Munnar, Kochi", highlights: "Houseboat, Tea Plantations, Kathakali Show", image: "../static/destinations/kerala.png" },
    { package_id: 9, name: "Singapore & Malaysia", duration: 8, budget: 135000, description: "Two countries, one incredible trip — modern cities meet tropical charm.", destinations: "Singapore, Kuala Lumpur, Langkawi", highlights: "Marina Bay, Petronas Towers, Island Hopping", image: "../static/destinations/singapore.png" },
    { package_id: 10, name: "Rajasthan Royal Tour", duration: 9, budget: 22000, description: "Forts, palaces, and vibrant culture across India's royal state.", destinations: "Jaipur, Udaipur, Jodhpur, Jaisalmer", highlights: "Amber Fort, Lake Pichola, Desert Camp", image: "../static/destinations/rajasthan.png" }
  ],

  trips: [
    { trip_id: 1, destination: "Paris, France", start_date: "2026-03-12", end_date: "2026-03-18", budget: 185000, traveler_id: 1, guide_id: 1, package_id: 1, status: "Confirmed" },
    { trip_id: 2, destination: "Tokyo, Japan", start_date: "2026-03-25", end_date: "2026-04-02", budget: 245000, traveler_id: 1, guide_id: 2, package_id: 2, status: "Pending" },
    { trip_id: 3, destination: "Swiss Alps", start_date: "2026-05-10", end_date: "2026-05-17", budget: 215000, traveler_id: 2, guide_id: 1, package_id: 3, status: "Planning" },
    { trip_id: 4, destination: "New York, USA", start_date: "2026-04-01", end_date: "2026-04-07", budget: 165000, traveler_id: 3, guide_id: 2, package_id: 5, status: "Confirmed" },
    { trip_id: 5, destination: "Goa, India", start_date: "2026-02-14", end_date: "2026-02-18", budget: 15000, traveler_id: 4, guide_id: 1, package_id: 7, status: "Completed" },
    { trip_id: 6, destination: "Dubai, UAE", start_date: "2026-03-20", end_date: "2026-03-25", budget: 285000, traveler_id: 4, guide_id: 2, package_id: 6, status: "Confirmed" },
    { trip_id: 7, destination: "Bali, Indonesia", start_date: "2026-04-10", end_date: "2026-04-16", budget: 95000, traveler_id: 4, guide_id: 1, package_id: 4, status: "Pending" },
    { trip_id: 8, destination: "Kerala, India", start_date: "2026-05-01", end_date: "2026-05-06", budget: 18500, traveler_id: 4, guide_id: null, package_id: 8, status: "Planning" },
    { trip_id: 9, destination: "Bali, Indonesia", start_date: "2026-04-20", end_date: "2026-04-26", budget: 95000, traveler_id: 2, guide_id: 2, package_id: 4, status: "Confirmed" },
    { trip_id: 10, destination: "Rajasthan, India", start_date: "2026-06-01", end_date: "2026-06-10", budget: 25000, traveler_id: 3, guide_id: 1, package_id: 10, status: "Planning" },
    { trip_id: 11, destination: "Singapore", start_date: "2026-07-05", end_date: "2026-07-13", budget: 195000, traveler_id: 1, guide_id: 2, package_id: 9, status: "Planning" },
    { trip_id: 12, destination: "Kerala, India", start_date: "2026-06-15", end_date: "2026-06-20", budget: 18500, traveler_id: 2, guide_id: 1, package_id: 8, status: "Pending" }
  ],

  bookings: [
    { booking_id: 1, booking_date: "2026-03-01", status: "Confirmed", trip_id: 1, traveler_id: 1, service: "Air France XY123", type: "Flight", amount: 48000 },
    { booking_id: 2, booking_date: "2026-03-01", status: "Confirmed", trip_id: 1, traveler_id: 1, service: "Hotel Lumiere", type: "Hotel", amount: 56000 },
    { booking_id: 3, booking_date: "2026-03-03", status: "Pending", trip_id: 1, traveler_id: 1, service: "Paris Metro Pass", type: "Transport", amount: 2500 },
    { booking_id: 4, booking_date: "2026-03-10", status: "Confirmed", trip_id: 2, traveler_id: 1, service: "ANA Flight NH101", type: "Flight", amount: 65000 },
    { booking_id: 5, booking_date: "2026-03-10", status: "Confirmed", trip_id: 2, traveler_id: 1, service: "Hotel Shinjuku Grand", type: "Hotel", amount: 78000 },
    { booking_id: 6, booking_date: "2026-02-05", status: "Confirmed", trip_id: 5, traveler_id: 4, service: "IndiGo 6E-231 DEL→GOI", type: "Flight", amount: 12500 },
    { booking_id: 7, booking_date: "2026-02-05", status: "Confirmed", trip_id: 5, traveler_id: 4, service: "Taj Fort Aguada Resort", type: "Hotel", amount: 24000 },
    { booking_id: 8, booking_date: "2026-02-06", status: "Confirmed", trip_id: 5, traveler_id: 4, service: "Scooter Rental (4 days)", type: "Transport", amount: 1800 },
    { booking_id: 9, booking_date: "2026-02-07", status: "Confirmed", trip_id: 5, traveler_id: 4, service: "Dudhsagar Falls Tour", type: "Activity", amount: 3500 },
    { booking_id: 10, booking_date: "2026-03-12", status: "Confirmed", trip_id: 6, traveler_id: 4, service: "Emirates EK-508 HYD→DXB", type: "Flight", amount: 52000 },
    { booking_id: 11, booking_date: "2026-03-12", status: "Confirmed", trip_id: 6, traveler_id: 4, service: "Atlantis The Palm", type: "Hotel", amount: 95000 },
    { booking_id: 12, booking_date: "2026-03-13", status: "Pending", trip_id: 6, traveler_id: 4, service: "Desert Safari Premium", type: "Activity", amount: 6500 },
    { booking_id: 13, booking_date: "2026-03-14", status: "Confirmed", trip_id: 6, traveler_id: 4, service: "Burj Khalifa 148th Floor", type: "Activity", amount: 4800 },
    { booking_id: 14, booking_date: "2026-03-25", status: "Pending", trip_id: 7, traveler_id: 4, service: "AirAsia QZ-265 DEL→DPS", type: "Flight", amount: 24500 },
    { booking_id: 15, booking_date: "2026-03-25", status: "Pending", trip_id: 7, traveler_id: 4, service: "Ubud Hanging Gardens", type: "Hotel", amount: 42000 },
    { booking_id: 16, booking_date: "2026-03-20", status: "Confirmed", trip_id: 4, traveler_id: 3, service: "Delta DL-185 BOM→JFK", type: "Flight", amount: 78000 },
    { booking_id: 17, booking_date: "2026-03-20", status: "Confirmed", trip_id: 4, traveler_id: 3, service: "The Roosevelt Hotel", type: "Hotel", amount: 85000 }
  ],

  payments: [
    { payment_id: 1, amount: 72000, payment_date: "2026-03-05", method: "Card", status: "Paid", booking_id: 1 },
    { payment_id: 2, amount: 102000, payment_date: "2026-03-05", method: "Card", status: "Paid", booking_id: 2 },
    { payment_id: 3, amount: 3800, payment_date: "2026-03-03", method: "UPI", status: "Pending", booking_id: 3 },
    { payment_id: 4, amount: 102000, payment_date: "2026-03-12", method: "Card", status: "Paid", booking_id: 4 },
    { payment_id: 5, amount: 136000, payment_date: "2026-03-12", method: "Card", status: "Paid", booking_id: 5 },
    { payment_id: 6, amount: 15700, payment_date: "2026-02-06", method: "UPI", status: "Paid", booking_id: 6 },
    { payment_id: 7, amount: 27200, payment_date: "2026-02-06", method: "Card", status: "Paid", booking_id: 7 },
    { payment_id: 8, amount: 2400, payment_date: "2026-02-14", method: "Cash", status: "Paid", booking_id: 8 },
    { payment_id: 9, amount: 3800, payment_date: "2026-02-15", method: "UPI", status: "Paid", booking_id: 9 },
    { payment_id: 10, amount: 57800, payment_date: "2026-03-14", method: "Card", status: "Paid", booking_id: 10 },
    { payment_id: 11, amount: 157200, payment_date: "2026-03-14", method: "Card", status: "Paid", booking_id: 11 },
    { payment_id: 12, amount: 10200, payment_date: "2026-03-15", method: "UPI", status: "Pending", booking_id: 12 },
    { payment_id: 13, amount: 8100, payment_date: "2026-03-15", method: "Card", status: "Paid", booking_id: 13 },
    { payment_id: 14, amount: 29700, payment_date: "2026-03-26", method: "Card", status: "Pending", booking_id: 14 },
    { payment_id: 15, amount: 61200, payment_date: "2026-03-26", method: "Card", status: "Pending", booking_id: 15 },
    { payment_id: 16, amount: 80700, payment_date: "2026-03-21", method: "Card", status: "Paid", booking_id: 16 },
    { payment_id: 17, amount: 93500, payment_date: "2026-03-21", method: "Card", status: "Paid", booking_id: 17 }
  ],

  refunds: [
    { refund_id: 1, payment_id: 2, refund_date: "2026-03-06", refund_time: "14:30:00", refund_status: "Processing" }
  ],

  itineraries: [
    // Paris trip (trip 1 — Ajith)
    { itinerary_id: 1, trip_id: 1, city: "Paris", day_number: 1, activity: "Arrival at Charles de Gaulle Airport", activity_status: "Completed", time: "09:00" },
    { itinerary_id: 2, trip_id: 1, city: "Paris", day_number: 1, activity: "Check-in at Hotel Lumiere", activity_status: "Completed", time: "11:30" },
    { itinerary_id: 3, trip_id: 1, city: "Paris", day_number: 1, activity: "Welcome Dinner at Le Petit Bistro", activity_status: "Completed", time: "19:00" },
    { itinerary_id: 4, trip_id: 1, city: "Paris", day_number: 2, activity: "Guided Tour of Louvre Museum", activity_status: "Confirmed", time: "10:00" },
    { itinerary_id: 5, trip_id: 1, city: "Paris", day_number: 2, activity: "Walk along Seine River", activity_status: "Pending", time: "15:00" },
    { itinerary_id: 6, trip_id: 1, city: "Paris", day_number: 3, activity: "Visit Eiffel Tower", activity_status: "Pending", time: "10:00" },
    // Goa trip (trip 5 — Jyotish, COMPLETED)
    { itinerary_id: 7, trip_id: 5, city: "Goa", day_number: 1, activity: "Arrival at Dabolim Airport", activity_status: "Completed", time: "10:30" },
    { itinerary_id: 8, trip_id: 5, city: "Goa", day_number: 1, activity: "Check-in at Taj Fort Aguada", activity_status: "Completed", time: "12:00" },
    { itinerary_id: 9, trip_id: 5, city: "Goa", day_number: 1, activity: "Baga Beach sunset walk", activity_status: "Completed", time: "17:00" },
    { itinerary_id: 10, trip_id: 5, city: "Goa", day_number: 2, activity: "Fort Aguada morning visit", activity_status: "Completed", time: "08:00" },
    { itinerary_id: 11, trip_id: 5, city: "Goa", day_number: 2, activity: "Lunch at Fisherman's Wharf", activity_status: "Completed", time: "12:30" },
    { itinerary_id: 12, trip_id: 5, city: "Goa", day_number: 2, activity: "Cruise on Mandovi River", activity_status: "Completed", time: "18:00" },
    { itinerary_id: 13, trip_id: 5, city: "Goa", day_number: 3, activity: "Dudhsagar Falls full-day trip", activity_status: "Completed", time: "07:00" },
    { itinerary_id: 14, trip_id: 5, city: "Goa", day_number: 4, activity: "South Goa beaches & departure", activity_status: "Completed", time: "09:00" },
    // Dubai trip (trip 6 — Jyotish, CONFIRMED)
    { itinerary_id: 15, trip_id: 6, city: "Dubai", day_number: 1, activity: "Arrival at Dubai International DXB", activity_status: "Confirmed", time: "14:00" },
    { itinerary_id: 16, trip_id: 6, city: "Dubai", day_number: 1, activity: "Check-in at Atlantis The Palm", activity_status: "Confirmed", time: "16:00" },
    { itinerary_id: 17, trip_id: 6, city: "Dubai", day_number: 1, activity: "Dinner at Nobu Restaurant", activity_status: "Confirmed", time: "20:00" },
    { itinerary_id: 18, trip_id: 6, city: "Dubai", day_number: 2, activity: "Burj Khalifa 148th floor observation", activity_status: "Confirmed", time: "09:00" },
    { itinerary_id: 19, trip_id: 6, city: "Dubai", day_number: 2, activity: "Dubai Mall & Aquarium", activity_status: "Confirmed", time: "12:00" },
    { itinerary_id: 20, trip_id: 6, city: "Dubai", day_number: 2, activity: "Dubai Fountain evening show", activity_status: "Pending", time: "19:00" },
    { itinerary_id: 21, trip_id: 6, city: "Dubai", day_number: 3, activity: "Desert Safari with BBQ dinner", activity_status: "Pending", time: "15:00" },
    { itinerary_id: 22, trip_id: 6, city: "Dubai", day_number: 4, activity: "Abu Dhabi day trip — Grand Mosque", activity_status: "Pending", time: "08:00" },
    { itinerary_id: 23, trip_id: 6, city: "Dubai", day_number: 5, activity: "Palm Jumeirah & Departure", activity_status: "Pending", time: "10:00" },
    // Bali trip (trip 7 — Jyotish, PENDING)
    { itinerary_id: 24, trip_id: 7, city: "Bali", day_number: 1, activity: "Arrival at Ngurah Rai Airport", activity_status: "Pending", time: "11:00" },
    { itinerary_id: 25, trip_id: 7, city: "Bali", day_number: 1, activity: "Transfer to Ubud Hanging Gardens", activity_status: "Pending", time: "14:00" },
    { itinerary_id: 26, trip_id: 7, city: "Bali", day_number: 2, activity: "Tegallalang Rice Terraces trek", activity_status: "Pending", time: "08:00" },
    { itinerary_id: 27, trip_id: 7, city: "Bali", day_number: 2, activity: "Ubud Monkey Forest", activity_status: "Pending", time: "14:00" },
    { itinerary_id: 28, trip_id: 7, city: "Bali", day_number: 3, activity: "Uluwatu Temple sunset", activity_status: "Pending", time: "16:00" },
    // New York trip (trip 4 — Rahul)
    { itinerary_id: 29, trip_id: 4, city: "New York", day_number: 1, activity: "Arrival at JFK Airport", activity_status: "Confirmed", time: "08:00" },
    { itinerary_id: 30, trip_id: 4, city: "New York", day_number: 1, activity: "Times Square walking tour", activity_status: "Confirmed", time: "14:00" },
    { itinerary_id: 31, trip_id: 4, city: "New York", day_number: 2, activity: "Statue of Liberty & Ellis Island", activity_status: "Confirmed", time: "09:00" },
    { itinerary_id: 32, trip_id: 4, city: "New York", day_number: 2, activity: "Brooklyn Bridge sunset walk", activity_status: "Pending", time: "17:00" }
  ],

  expenses: [
    { expense_id: 1, amount: 51000, type: "Hotel", trip_id: 1, description: "Hotel Lumiere Deposit" },
    { expense_id: 2, amount: 72000, type: "Flight", trip_id: 1, description: "Air France XY123" },
    { expense_id: 3, amount: 3800, type: "Transport", trip_id: 1, description: "Metro Pass" },
    { expense_id: 4, amount: 7200, type: "Food", trip_id: 1, description: "Restaurant La Belle" },
    { expense_id: 5, amount: 15700, type: "Flight", trip_id: 5, description: "IndiGo 6E-231 DEL→GOI" },
    { expense_id: 6, amount: 27200, type: "Hotel", trip_id: 5, description: "Taj Fort Aguada 4 nights" },
    { expense_id: 7, amount: 2400, type: "Transport", trip_id: 5, description: "Scooter rental" },
    { expense_id: 8, amount: 3800, type: "Activity", trip_id: 5, description: "Dudhsagar Falls tour" },
    { expense_id: 9, amount: 5500, type: "Food", trip_id: 5, description: "Fisherman's Wharf dinner" },
    { expense_id: 10, amount: 3000, type: "Food", trip_id: 5, description: "Baga Beach shacks" },
    { expense_id: 11, amount: 1800, type: "Shopping", trip_id: 5, description: "Anjuna Flea Market souvenirs" },
    { expense_id: 12, amount: 57800, type: "Flight", trip_id: 6, description: "Emirates EK-508 HYD→DXB" },
    { expense_id: 13, amount: 157200, type: "Hotel", trip_id: 6, description: "Atlantis The Palm 5 nights" },
    { expense_id: 14, amount: 8100, type: "Activity", trip_id: 6, description: "Burj Khalifa 148th Floor" },
    { expense_id: 15, amount: 10200, type: "Activity", trip_id: 6, description: "Desert Safari Premium" },
    { expense_id: 16, amount: 80700, type: "Flight", trip_id: 4, description: "Delta DL-185 BOM→JFK" },
    { expense_id: 17, amount: 93500, type: "Hotel", trip_id: 4, description: "The Roosevelt Hotel" }
  ],

  reviews: [
    { review_id: 1, trip_id: 1, traveler_id: 1, guide_id: 1, trip_rating: 5, guide_rating: 5, comment: "Amazing trip! The guide was excellent.", created_at: "2026-03-20" },
    { review_id: 2, trip_id: 5, traveler_id: 4, guide_id: 1, trip_rating: 5, guide_rating: 4, comment: "Goa was fantastic! Loved the itinerary.", created_at: "2026-02-20" }
  ],

  supportTickets: [
    { ticket_id: 101, case_id: 1, traveler_id: 1, description: "Customer booked Hotel Lumiere for 6 nights but confirmation shows only 5 nights.", issue_type: "Hotel booking mismatch", care_id: 1, priority: "High", status: "Open", created: "2026-03-29T10:00:00" },
    { ticket_id: 102, case_id: 2, traveler_id: 2, description: "Flight cancelled, requesting refund.", issue_type: "Flight cancellation refund", care_id: 1, priority: "Medium", status: "In Progress", created: "2026-03-29T07:00:00" },
    { ticket_id: 103, case_id: 3, traveler_id: 3, description: "Payment deducted but not reflecting in bookings.", issue_type: "Payment not reflecting", care_id: 2, priority: "High", status: "Open", created: "2026-03-28T10:00:00" },
    { ticket_id: 104, case_id: 4, traveler_id: 4, description: "Desert Safari booking shows wrong date — should be March 22 not March 23.", issue_type: "Booking date correction", care_id: 1, priority: "Medium", status: "In Progress", created: "2026-03-30T09:00:00" }
  ],

  packageBookings: [
    { packagebooking_id: 1, booking_date: "2026-03-01", status: "Confirmed", traveler_id: 1, package_id: 2 },
    { packagebooking_id: 2, booking_date: "2026-03-05", status: "Pending", traveler_id: 2, package_id: 3 },
    { packagebooking_id: 3, booking_date: "2026-02-01", status: "Confirmed", traveler_id: 4, package_id: 7 },
    { packagebooking_id: 4, booking_date: "2026-03-10", status: "Confirmed", traveler_id: 4, package_id: 6 },
    { packagebooking_id: 5, booking_date: "2026-03-22", status: "Pending", traveler_id: 4, package_id: 4 },
    { packagebooking_id: 6, booking_date: "2026-03-28", status: "Planning", traveler_id: 4, package_id: 8 }
  ],

  messages: [
    { message_id: 1, sender: "support", sender_id: 1, receiver: "traveler", receiver_id: 1, content: "Hello Ajith, we are looking into your hotel booking issue.", timestamp: "2026-03-31T10:00:00" },
    { message_id: 2, sender: "traveler", sender_id: 1, receiver: "support", receiver_id: 1, content: "Thank you Sarah. I appreciate the help.", timestamp: "2026-03-31T10:05:00" }
  ]
};

// Persistence Logic for Prototype
const DB_STORAGE_KEY = 'gs_database';

function loadDB() {
  const stored = sessionStorage.getItem(DB_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.keys(DB).forEach(key => {
      if (parsed[key] !== undefined) DB[key] = parsed[key];
    });
  } else {
    saveDB(); 
  }
}

function saveDB() {
  sessionStorage.setItem(DB_STORAGE_KEY, JSON.stringify(DB));
}

// Load DB immediately
loadDB();

// =========================
// SESSION MANAGEMENT
// =========================
const Auth = {
  login(role, user) {
    sessionStorage.setItem('role', role);
    sessionStorage.setItem('user', JSON.stringify(user));
  },
  logout() {
    sessionStorage.clear();
    window.location.href = '/front-end/index.html';
  },
  getRole() { return sessionStorage.getItem('role'); },
  getUser() { return JSON.parse(sessionStorage.getItem('user') || 'null'); },
  isLoggedIn() { return !!sessionStorage.getItem('role'); },
  requireRole(role) {
    if (this.getRole() !== role) {
      window.location.href = '../../index.html';
    }
  }
};
