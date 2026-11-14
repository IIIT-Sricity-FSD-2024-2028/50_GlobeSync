-- =================================================================================
-- GlobeSync — Travel Itinerary Planning & Coordination Platform Database
-- Database: travel_booking
-- Domain: Travel & Hospitality
-- Completely Sanitized Production Schema and Domain Data (No Junk / Placeholder Records)
-- =================================================================================

CREATE DATABASE IF NOT EXISTS travel_booking;
USE travel_booking;

-- Drop dependent tables in reverse dependency order
DROP TABLE IF EXISTS TicketReply;
DROP TABLE IF EXISTS SupportTicket;
DROP TABLE IF EXISTS Message;
DROP TABLE IF EXISTS Review;
DROP TABLE IF EXISTS Refund;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Expenses;
DROP TABLE IF EXISTS Itinerary;
DROP TABLE IF EXISTS CommissionLedger;
DROP TABLE IF EXISTS FeaturedListing;
DROP TABLE IF EXISTS AgencySubscription;
DROP TABLE IF EXISTS SubscriptionPlan;
DROP TABLE IF EXISTS RevenueTransaction;
DROP TABLE IF EXISTS RevenueConfig;
DROP TABLE IF EXISTS Booking;
DROP TABLE IF EXISTS PackageBooking;
DROP TABLE IF EXISTS CustomTrip;
DROP TABLE IF EXISTS Trip;
DROP TABLE IF EXISTS Passenger;
DROP TABLE IF EXISTS Package;
DROP TABLE IF EXISTS Agency;
DROP TABLE IF EXISTS TravelGuide;
DROP TABLE IF EXISTS CustomerCare;
DROP TABLE IF EXISTS Traveler;
DROP TABLE IF EXISTS Administrator;

-- =================================================================================
-- 1. ENTITY TABLES (ACTORS & CORE DOMAIN ENTITIES)
-- =================================================================================

-- 1.1 ADMINISTRATORS
CREATE TABLE Administrator (
    admin_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' -- 'admin' | 'superuser'
);

-- 1.2 TRAVELERS
CREATE TABLE Traveler (
    traveler_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    gender VARCHAR(10),
    age INT,
    password VARCHAR(100) NOT NULL
);

-- 1.3 CUSTOMER CARE / SUPPORT AGENTS
CREATE TABLE CustomerCare (
    care_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'support'
);

-- 1.4 TRAVEL GUIDES
CREATE TABLE TravelGuide (
    guide_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    languages VARCHAR(150) NOT NULL,
    experience INT NOT NULL,
    rating DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    price_per_trip DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    contact VARCHAR(50) NOT NULL,
    admin_id INT NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'guide',
    FOREIGN KEY (admin_id) REFERENCES Administrator(admin_id)
);

-- 1.5 TRAVEL AGENCIES (B2B RESELLERS)
CREATE TABLE Agency (
    agency_id INT PRIMARY KEY,
    business_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(100),
    contact_email VARCHAR(100) UNIQUE NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    password VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    commission_rate DECIMAL(5,2) DEFAULT 1.50,
    license_gstin VARCHAR(50),
    office_address TEXT,
    payout_bank_upi VARCHAR(100),
    created_at DATE NOT NULL
);

-- 1.6 PASSENGERS (CO-TRAVELERS & OFFLINE AGENCY CLIENTS)
CREATE TABLE Passenger (
    passenger_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(10) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    dob DATE,
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    special_notes TEXT,
    traveler_id INT NULL,
    agency_id INT NULL,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id) ON DELETE CASCADE,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE CASCADE
);

-- 1.7 TOUR PACKAGES (CURATED PRE-PLANNED EXPERIENCES)
CREATE TABLE Package (
    package_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    duration INT NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    description TEXT,
    destinations VARCHAR(150) NOT NULL,
    highlights TEXT,
    image VARCHAR(255)
);

-- 1.8 TRIPS (CENTRAL ITINERARY RECORD)
CREATE TABLE Trip (
    trip_id INT PRIMARY KEY,
    title VARCHAR(150),
    origin VARCHAR(100) NOT NULL DEFAULT 'New Delhi, India',
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Planning', -- 'Planning' | 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled'
    guide_status VARCHAR(30) NULL, -- 'Pending' | 'Accepted' | 'Declined'
    traveler_id INT NULL,
    agency_id INT NULL,
    guide_id INT NULL,
    package_id INT NULL,
    category VARCHAR(50),
    notes TEXT,
    travelers_count INT DEFAULT 1,
    cancellation_reason TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id) ON DELETE SET NULL,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE SET NULL,
    FOREIGN KEY (guide_id) REFERENCES TravelGuide(guide_id) ON DELETE SET NULL,
    FOREIGN KEY (package_id) REFERENCES Package(package_id) ON DELETE SET NULL
);

-- 1.9 BOOKINGS (TRANSPORT, STAY, ACTIVITY & PACKAGE RESERVATIONS)
CREATE TABLE Booking (
    booking_id INT PRIMARY KEY,
    booking_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Confirmed' | 'Cancelled'
    trip_id INT NOT NULL,
    traveler_id INT NULL,
    agency_id INT NULL,
    service VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'Flight' | 'Hotel' | 'Transport' | 'Activity' | 'Package'
    amount DECIMAL(10,2) NOT NULL,
    insurance_selected TINYINT(1) DEFAULT 0,
    insurance_rate DECIMAL(5,2) DEFAULT 0.00,
    insurance_amount DECIMAL(10,2) DEFAULT 0.00,
    cancellation_protection_selected TINYINT(1) DEFAULT 0,
    cancellation_fee DECIMAL(10,2) DEFAULT 0.00,
    cancellation_reason TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id) ON DELETE SET NULL,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE SET NULL
);

-- 1.10 DAILY ITINERARY ACTIVITIES
CREATE TABLE Itinerary (
    itinerary_id INT PRIMARY KEY,
    trip_id INT NOT NULL,
    city VARCHAR(100) NOT NULL,
    day_number INT NOT NULL,
    activity TEXT NOT NULL,
    activity_status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Confirmed' | 'Completed'
    time VARCHAR(10) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE CASCADE
);

-- 1.11 EXPENSES
CREATE TABLE Expenses (
    expense_id INT PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'Hotel' | 'Flight' | 'Transport' | 'Food' | 'Activity' | 'Shopping' | 'Package'
    trip_id INT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE CASCADE
);

-- 1.12 PAYMENTS
CREATE TABLE Payment (
    payment_id INT PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(30) NOT NULL, -- 'Card' | 'UPI' | 'Cash'
    status VARCHAR(30) NOT NULL DEFAULT 'Paid', -- 'Paid' | 'Pending'
    booking_id INT NULL,
    trip_id INT NULL,
    agency_id INT NULL,
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE SET NULL,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE SET NULL,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE SET NULL
);

-- 1.13 REFUNDS
CREATE TABLE Refund (
    refund_id INT PRIMARY KEY,
    payment_id INT NOT NULL,
    refund_date DATE NOT NULL,
    refund_time TIME NOT NULL,
    refund_status VARCHAR(30) NOT NULL DEFAULT 'Processing', -- 'Processing' | 'Completed' | 'Rejected'
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    agency_id INT NULL,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE SET NULL
);

-- 1.14 REVIEWS & FEEDBACK
CREATE TABLE Review (
    review_id INT PRIMARY KEY,
    trip_id INT NOT NULL,
    traveler_id INT NOT NULL,
    guide_id INT NOT NULL,
    trip_rating INT NOT NULL,
    guide_rating INT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATE NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id) ON DELETE CASCADE,
    FOREIGN KEY (guide_id) REFERENCES TravelGuide(guide_id) ON DELETE CASCADE
);

-- 1.15 SUPPORT TICKETS & CONVERSATION THREADS
CREATE TABLE SupportTicket (
    ticket_id INT PRIMARY KEY,
    case_id INT NOT NULL,
    description TEXT NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    care_id INT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'High' | 'Medium' | 'Low'
    status VARCHAR(30) NOT NULL DEFAULT 'Open', -- 'Open' | 'In Progress' | 'Resolved' | 'Closed'
    created DATETIME NOT NULL,
    traveler_id INT NULL,
    agency_id INT NULL,
    trip_id INT NULL,
    FOREIGN KEY (care_id) REFERENCES CustomerCare(care_id) ON DELETE CASCADE,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id) ON DELETE SET NULL,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE SET NULL,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE SET NULL
);

CREATE TABLE TicketReply (
    ticket_id INT NOT NULL,
    reply_id INT NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    sender_id INT NULL,
    sender_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (ticket_id, reply_id),
    FOREIGN KEY (ticket_id) REFERENCES SupportTicket(ticket_id) ON DELETE CASCADE
);

-- 1.16 IN-APP DIRECT MESSAGING
CREATE TABLE Message (
    message_id INT PRIMARY KEY,
    sender VARCHAR(20) NOT NULL, -- 'traveler' | 'guide' | 'support' | 'agency'
    sender_id INT NOT NULL,
    receiver VARCHAR(20) NOT NULL, -- 'traveler' | 'guide' | 'support' | 'agency'
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL
);

-- 1.17 COMMISSION LEDGER (AGENCY SETTLEMENTS)
CREATE TABLE CommissionLedger (
    commission_id INT PRIMARY KEY,
    agency_id INT NOT NULL,
    trip_id INT NOT NULL,
    gross_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending' | 'earned' | 'settled' | 'cancelled'
    created_at DATETIME NOT NULL,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id) ON DELETE CASCADE
);

-- =================================================================================
-- 2. INSERT SANITIZED DATA (ZERO JUNK / COMPLETE DOMAIN SEED)
-- =================================================================================

-- 2.1 Administrators
INSERT INTO Administrator (admin_id, name, email, password, role) VALUES
(1, 'Super Admin', 'superadmin@ticp.com', 'super123', 'superuser'),
(2, 'Manoj Gupta', 'admin@ticp.com', 'admin123', 'admin'),
(3, 'Sanjay Reddy', 'sanjay@gmail.com', 'sanjay123', 'admin');

-- 2.2 CustomerCare Users
INSERT INTO CustomerCare (care_id, name, contact, email, password, role) VALUES
(1, 'Aisha Khan', '9001122334', 'Aisha.johnson@gmail.com', 'support123', 'support'),
(2, 'Farhan Ali', '9445566778', 'Farhan.teja@gmail.com', 'support123', 'support');

-- 2.3 Travel Guides
INSERT INTO TravelGuide (guide_id, name, languages, experience, rating, price_per_trip, contact, admin_id, email, password, role) VALUES
(1, 'Devansh', 'English, Hindi, French', 5, 4.8, 5500, '9876501234', 1, 'Devansh@gmail.com', 'guide123', 'guide'),
(2, 'Mateo', 'English, Japanese, Hindi', 8, 4.5, 8500, '9876509876', 1, 'Mateo@gmail.com', 'guide123', 'guide'),
(3, 'Elena', 'English, Spanish, Hindi', 3, 4.2, 5000, '9871234567', 2, 'Elena@gmail.com', 'guide123', 'guide'),
(4, 'Kael', 'English, German, Hindi', 12, 4.9, 12000, '9812345678', 2, 'Kael@gmail.com', 'guide123', 'guide'),
(5, 'Omar', 'English, Hindi', 15, 5, 15000, '9900112233', 3, 'Omar@gmail.com', 'guide123', 'guide');

-- 2.4 Travelers
INSERT INTO Traveler (traveler_id, name, phone, email, gender, age, password) VALUES
(1, 'Arjun Mehta', '9876543210', 'Arjun@gmail.com', 'Male', 28, 'traveler123'),
(2, 'Kavya Desai', '9123456789', 'Kavya@gmail.com', 'Female', 25, 'traveler123'),
(3, 'Rohan Varma', '9988776655', 'Rohan@gmail.com', 'Male', 32, 'traveler123'),
(4, 'Nitin Joshi', '9110587215', 'Nitin@gmail.com', 'Male', 32, 'Nitin123');

-- 2.5 Agencies
INSERT INTO Agency (agency_id, business_name, contact_person, contact_email, contact_phone, password, status, commission_rate, license_gstin, office_address, payout_bank_upi, created_at) VALUES
(1, 'Horizon Travel Partners', 'Rajesh Mehra', 'ops@horizontravel.com', '9876543210', 'horizon123', 'approved', 1.5, '07AAAAA0000A1Z5', 'Suite 402, Connaught Place, New Delhi, 110001', 'horizon@hdfcbank', '2024-01-15'),
(2, 'Wanderlust Resellers', 'Priya Kapoor', 'bookings@wanderlust.in', '9123456780', 'wander123', 'approved', 1.2, '27BBBBB1111B2Z6', 'Bandra West, Mumbai, 400050', 'wanderlust@icici', '2024-02-20'),
(3, 'NextStop Adventures', 'Amit Sinha', 'hello@nextstop.travel', '9988776655', 'nextstop123', 'pending', 1.5, NULL, NULL, NULL, '2024-03-05');

-- 2.6 Passengers
INSERT INTO Passenger (passenger_id, name, age, gender, email, phone, dob, id_type, id_number, special_notes, traveler_id, agency_id) VALUES
(1, 'Sita Mehta', 25, 'Female', NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL),
(2, 'Rohan Mehta', 5, 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL),
(3, 'Vikram Sharma', 34, 'Male', 'vikram.s@example.com', '+91 98765 43210', '1990-04-15', 'Passport', 'Z8765432', 'Vegetarian meals only', NULL, 1),
(4, 'Ananya Sharma', 31, 'Female', 'ananya.s@example.com', '+91 98765 43211', '1993-08-22', 'Passport', 'Z8765433', 'Window seat preferred', NULL, 1),
(5, 'Kabir Sharma', 6, 'Male', 'vikram.s@example.com', '+91 98765 43210', '2018-11-10', 'Aadhaar', '****-****-4591', 'Child meal', NULL, 1);

-- 2.7 Curated Tour Packages
INSERT INTO Package (package_id, name, duration, budget, description, destinations, highlights, image) VALUES
(1, 'Paris Deluxe', 7, 145000, 'Explore the City of Light with guided tours, luxury stays, and Seine cruises.', 'Paris', 'Eiffel Tower, Louvre, Montmartre', '../static/destinations/paris.png'),
(2, 'Tokyo Explorer', 10, 195000, 'Discover Japan''s vibrant capital — temples, street food, and neon nights.', 'Tokyo, Kyoto', 'Shibuya, Senso-ji, Mt. Fuji day trip', '../static/destinations/tokyo.png'),
(3, 'Swiss Alps Adventure', 7, 165000, 'Mountain trails, scenic trains, and alpine lakes in breathtaking Switzerland.', 'Zurich, Interlaken, Zermatt', 'Jungfraujoch, Glacier Express, Lake Geneva', '../static/destinations/swiss_alps.png'),
(4, 'Bali Bliss Retreat', 6, 75000, 'Tropical paradise with rice terraces, temples, and stunning sunsets.', 'Ubud, Seminyak, Nusa Dua', 'Tegallalang, Uluwatu Temple, Snorkeling', '../static/destinations/bali.png'),
(5, 'New York City Rush', 5, 155000, 'The Big Apple — Broadway, Central Park, and world-class dining.', 'New York', 'Times Square, Statue of Liberty, Brooklyn Bridge', '../static/destinations/new_york.png'),
(6, 'Dubai Luxury Escape', 5, 215000, 'Desert safaris, skyscrapers, and opulent shopping in the UAE.', 'Dubai, Abu Dhabi', 'Burj Khalifa, Desert Safari, Palm Jumeirah', '../static/destinations/dubai.png'),
(7, 'Goa Beach Getaway', 4, 12000, 'Sun, sand, and seafood on India''s most beloved coastline.', 'North Goa, South Goa', 'Baga Beach, Fort Aguada, Dudhsagar Falls', '../static/destinations/goa.png'),
(8, 'Kerala Backwaters', 5, 16500, 'Houseboat cruise through serene backwaters and lush hill stations.', 'Alleppey, Munnar, Kochi', 'Houseboat, Tea Plantations, Kathakali Show', '../static/destinations/kerala.png'),
(9, 'Singapore & Malaysia', 8, 135000, 'Two countries, one incredible trip — modern cities meet tropical charm.', 'Singapore, Kuala Lumpur, Langkawi', 'Marina Bay, Petronas Towers, Island Hopping', '../static/destinations/singapore.png'),
(10, 'Rajasthan Royal Tour', 9, 22000, 'Forts, palaces, and vibrant culture across India''s royal state.', 'Jaipur, Udaipur, Jodhpur, Jaisalmer', 'Amber Fort, Lake Pichola, Desert Camp', '../static/destinations/rajasthan.png');

-- 2.8 Trips
INSERT INTO Trip (trip_id, title, origin, destination, start_date, end_date, budget, status, guide_status, traveler_id, agency_id, guide_id, package_id, category, notes, travelers_count, cancellation_reason, cancelled_at) VALUES
(1, NULL, 'New Delhi, India', 'Paris, France', '2026-03-12', '2026-03-18', 185000, 'Confirmed', 'Accepted', 1, NULL, 1, 1, NULL, NULL, 1, NULL, NULL),
(2, NULL, 'Mumbai, India', 'Tokyo, Japan', '2026-03-25', '2026-04-02', 245000, 'Pending', 'Pending', 1, NULL, 2, 2, NULL, NULL, 1, NULL, NULL),
(3, NULL, 'Bengaluru, India', 'Swiss Alps', '2026-05-10', '2026-05-17', 215000, 'Planning', 'Pending', 2, NULL, 1, 3, NULL, NULL, 1, NULL, NULL),
(4, NULL, 'New Delhi, India', 'New York, USA', '2026-04-01', '2026-04-07', 165000, 'Confirmed', 'Accepted', 3, NULL, 2, 5, NULL, NULL, 1, NULL, NULL),
(5, NULL, 'Mumbai, India', 'Goa, India', '2026-02-14', '2026-02-18', 15000, 'Completed', 'Accepted', 4, NULL, 1, 7, NULL, NULL, 1, NULL, NULL),
(6, NULL, 'Bengaluru, India', 'Dubai, UAE', '2026-03-20', '2026-03-25', 285000, 'Confirmed', 'Accepted', 4, NULL, 2, 6, NULL, NULL, 1, NULL, NULL),
(7, NULL, 'Chennai, India', 'Bali, Indonesia', '2026-04-10', '2026-04-16', 95000, 'Pending', 'Pending', 4, NULL, 1, 4, NULL, NULL, 1, NULL, NULL),
(8, NULL, 'Bengaluru, India', 'Kerala, India', '2026-05-01', '2026-05-06', 18500, 'Planning', NULL, 4, NULL, NULL, 8, NULL, NULL, 1, NULL, NULL),
(9, NULL, 'Hyderabad, India', 'Bali, Indonesia', '2026-04-20', '2026-04-26', 95000, 'Confirmed', 'Accepted', 2, NULL, 2, 4, NULL, NULL, 1, NULL, NULL),
(10, NULL, 'New Delhi, India', 'Rajasthan, India', '2026-06-01', '2026-06-10', 25000, 'Planning', 'Pending', 3, NULL, 1, 10, NULL, NULL, 1, NULL, NULL),
(11, NULL, 'Kolkata, India', 'Singapore', '2026-07-05', '2026-07-13', 195000, 'Planning', 'Pending', 1, NULL, 2, 9, NULL, NULL, 1, NULL, NULL),
(12, NULL, 'Chennai, India', 'Kerala, India', '2026-06-15', '2026-06-20', 18500, 'Pending', 'Pending', 2, NULL, 1, 8, NULL, NULL, 1, NULL, NULL),
(13, 'European Roman Holiday', 'Mumbai, India', 'Rome, Italy', '2025-12-05', '2025-12-12', 175000, 'Completed', 'Accepted', NULL, 1, 1, 1, NULL, NULL, 1, NULL, NULL),
(14, NULL, 'New Delhi, India', 'Sydney, Australia', '2026-01-10', '2026-01-20', 220000, 'Completed', 'Accepted', 2, NULL, 1, 2, NULL, NULL, 1, NULL, NULL),
(15, NULL, 'Bengaluru, India', 'Cape Town, South Africa', '2025-11-15', '2025-11-22', 160000, 'Completed', 'Accepted', 3, NULL, 1, 3, NULL, NULL, 1, NULL, NULL),
(16, NULL, 'Mumbai, India', 'London, UK', '2025-08-10', '2025-08-17', 195000, 'Completed', 'Accepted', 4, NULL, 1, 1, NULL, NULL, 1, NULL, NULL),
(17, NULL, 'New Delhi, India', 'Kyoto, Japan', '2025-04-05', '2025-04-12', 210000, 'Completed', 'Accepted', 1, NULL, 2, 2, NULL, NULL, 1, NULL, NULL),
(18, NULL, 'Bengaluru, India', 'Machu Picchu, Peru', '2025-09-20', '2025-09-28', 150000, 'Completed', 'Accepted', 2, NULL, 2, 4, NULL, NULL, 1, NULL, NULL),
(19, NULL, 'Mumbai, India', 'Cairo, Egypt', '2025-10-15', '2025-10-22', 140000, 'Completed', 'Accepted', 3, NULL, 1, 6, NULL, NULL, 1, NULL, NULL),
(20, NULL, 'New Delhi, India', 'Reykjavik, Iceland', '2025-01-10', '2025-01-18', 280000, 'Completed', 'Accepted', 4, NULL, 2, 5, NULL, NULL, 1, NULL, NULL),
(21, 'Switzerland Scenic Express', 'Mumbai, India', 'Swiss Alps', '2026-07-15', '2026-07-22', 260000, 'Confirmed', 'Accepted', NULL, 1, 1, 3, NULL, NULL, 2, NULL, NULL),
(22, 'Tokyo Autumn Adventure', 'New Delhi, India', 'Tokyo, Japan', '2026-10-05', '2026-10-12', 195000, 'Planning', NULL, NULL, 1, NULL, NULL, NULL, NULL, 1, NULL, NULL);

-- 2.9 Bookings
INSERT INTO Booking (booking_id, booking_date, status, trip_id, traveler_id, agency_id, service, type, amount, insurance_selected, insurance_rate, insurance_amount, cancellation_protection_selected, cancellation_fee, cancellation_reason, cancelled_at) VALUES
(1, '2026-03-01', 'Confirmed', 1, 1, NULL, 'Air France XY123', 'Flight', 48000, 0, 0, 0, 0, 0, NULL, NULL),
(2, '2026-03-01', 'Confirmed', 1, 1, NULL, 'Hotel Lumiere', 'Hotel', 56000, 0, 0, 0, 0, 0, NULL, NULL),
(3, '2026-03-03', 'Pending', 1, 1, NULL, 'Paris Metro Pass', 'Transport', 2500, 0, 0, 0, 0, 0, NULL, NULL),
(4, '2026-03-10', 'Confirmed', 2, 1, NULL, 'ANA Flight NH101', 'Flight', 65000, 0, 0, 0, 0, 0, NULL, NULL),
(5, '2026-03-10', 'Confirmed', 2, 1, NULL, 'Hotel Shinjuku Grand', 'Hotel', 78000, 0, 0, 0, 0, 0, NULL, NULL),
(6, '2026-02-05', 'Confirmed', 5, 4, NULL, 'IndiGo 6E-231 DEL→GOI', 'Flight', 12500, 0, 0, 0, 0, 0, NULL, NULL),
(7, '2026-02-05', 'Confirmed', 5, 4, NULL, 'Taj Fort Aguada Resort', 'Hotel', 24000, 0, 0, 0, 0, 0, NULL, NULL),
(8, '2026-02-06', 'Confirmed', 5, 4, NULL, 'Scooter Rental (4 days)', 'Transport', 1800, 0, 0, 0, 0, 0, NULL, NULL),
(9, '2026-02-07', 'Confirmed', 5, 4, NULL, 'Dudhsagar Falls Tour', 'Activity', 3500, 0, 0, 0, 0, 0, NULL, NULL),
(10, '2026-03-12', 'Confirmed', 6, 4, NULL, 'Emirates EK-508 HYD→DXB', 'Flight', 52000, 0, 0, 0, 0, 0, NULL, NULL),
(11, '2026-03-12', 'Confirmed', 6, 4, NULL, 'Atlantis The Palm', 'Hotel', 95000, 0, 0, 0, 0, 0, NULL, NULL),
(12, '2026-03-13', 'Pending', 6, 4, NULL, 'Desert Safari Premium', 'Activity', 6500, 0, 0, 0, 0, 0, NULL, NULL),
(13, '2026-03-14', 'Confirmed', 6, 4, NULL, 'Burj Khalifa 148th Floor', 'Activity', 4800, 0, 0, 0, 0, 0, NULL, NULL),
(14, '2026-03-25', 'Pending', 7, 4, NULL, 'AirAsia QZ-265 DEL→DPS', 'Flight', 24500, 0, 0, 0, 0, 0, NULL, NULL),
(15, '2026-03-25', 'Pending', 7, 4, NULL, 'Ubud Hanging Gardens', 'Hotel', 42000, 0, 0, 0, 0, 0, NULL, NULL),
(16, '2026-03-20', 'Confirmed', 4, 3, NULL, 'Delta DL-185 BOM→JFK', 'Flight', 78000, 0, 0, 0, 0, 0, NULL, NULL),
(17, '2026-03-20', 'Confirmed', 4, 3, NULL, 'The Roosevelt Hotel', 'Hotel', 85000, 0, 0, 0, 0, 0, NULL, NULL),
(18, '2025-12-05', 'Confirmed', 13, NULL, 1, 'European Roman Holiday — Wholesale Package', 'Package', 175000, 0, 0, 0, 0, 0, NULL, NULL),
(19, '2026-07-01', 'Confirmed', 21, NULL, 1, 'Switzerland Scenic Express — Client Resell', 'Package', 260000, 0, 0, 0, 0, 0, NULL, NULL),
(20, '2026-04-10', 'Confirmed', 9, 2, NULL, 'Garuda Indonesia GA-881 BLR→DPS', 'Flight', 42000, 0, 0, 0, 0, 0, NULL, NULL),
(21, '2026-04-10', 'Confirmed', 9, 2, NULL, 'Seminyak Beachfront Resort', 'Hotel', 53000, 0, 0, 0, 0, 0, NULL, NULL);

-- 2.10 Itineraries
INSERT INTO Itinerary (itinerary_id, trip_id, city, day_number, activity, activity_status, time) VALUES
(1, 1, 'Paris', 1, 'Arrival at Charles de Gaulle Airport', 'Completed', '09:00'),
(2, 1, 'Paris', 1, 'Check-in at Hotel Lumiere', 'Completed', '11:30'),
(3, 1, 'Paris', 1, 'Welcome Dinner at Le Petit Bistro', 'Completed', '19:00'),
(4, 1, 'Paris', 2, 'Guided Tour of Louvre Museum', 'Confirmed', '10:00'),
(5, 1, 'Paris', 2, 'Walk along Seine River', 'Pending', '15:00'),
(6, 1, 'Paris', 3, 'Visit Eiffel Tower', 'Pending', '10:00'),
(7, 5, 'Goa', 1, 'Arrival at Dabolim Airport', 'Completed', '10:30'),
(8, 5, 'Goa', 1, 'Check-in at Taj Fort Aguada', 'Completed', '12:00'),
(9, 5, 'Goa', 1, 'Baga Beach sunset walk', 'Completed', '17:00'),
(10, 5, 'Goa', 2, 'Fort Aguada morning visit', 'Completed', '08:00'),
(11, 5, 'Goa', 2, 'Lunch at Fisherman''s Wharf', 'Completed', '12:30'),
(12, 5, 'Goa', 2, 'Cruise on Mandovi River', 'Completed', '18:00'),
(13, 5, 'Goa', 3, 'Dudhsagar Falls full-day trip', 'Completed', '07:00'),
(14, 5, 'Goa', 4, 'South Goa beaches & departure', 'Completed', '09:00'),
(15, 6, 'Dubai', 1, 'Arrival at Dubai International DXB', 'Confirmed', '14:00'),
(16, 6, 'Dubai', 1, 'Check-in at Atlantis The Palm', 'Confirmed', '16:00'),
(17, 6, 'Dubai', 1, 'Dinner at Nobu Restaurant', 'Confirmed', '20:00'),
(18, 6, 'Dubai', 2, 'Burj Khalifa 148th floor observation', 'Confirmed', '09:00'),
(19, 6, 'Dubai', 2, 'Dubai Mall & Aquarium', 'Confirmed', '12:00'),
(20, 6, 'Dubai', 2, 'Dubai Fountain evening show', 'Pending', '19:00'),
(21, 6, 'Dubai', 3, 'Desert Safari with BBQ dinner', 'Pending', '15:00'),
(22, 6, 'Dubai', 4, 'Abu Dhabi day trip — Grand Mosque', 'Pending', '08:00'),
(23, 6, 'Dubai', 5, 'Palm Jumeirah & Departure', 'Pending', '10:00'),
(24, 7, 'Bali', 1, 'Arrival at Ngurah Rai Airport', 'Pending', '11:00'),
(25, 7, 'Bali', 1, 'Transfer to Ubud Hanging Gardens', 'Pending', '14:00'),
(26, 7, 'Bali', 2, 'Tegallalang Rice Terraces trek', 'Pending', '08:00'),
(27, 7, 'Bali', 2, 'Ubud Monkey Forest', 'Pending', '14:00'),
(28, 7, 'Bali', 3, 'Uluwatu Temple sunset', 'Pending', '16:00'),
(29, 4, 'New York', 1, 'Arrival at JFK Airport', 'Confirmed', '08:00'),
(30, 4, 'New York', 1, 'Times Square walking tour', 'Confirmed', '14:00'),
(31, 4, 'New York', 2, 'Statue of Liberty & Ellis Island', 'Confirmed', '09:00'),
(32, 4, 'New York', 2, 'Brooklyn Bridge sunset walk', 'Pending', '17:00');

-- 2.11 Expenses
INSERT INTO Expenses (expense_id, amount, type, trip_id, description) VALUES
(1, 51000, 'Hotel', 1, 'Hotel Lumiere Deposit'),
(2, 72000, 'Flight', 1, 'Air France XY123'),
(3, 3800, 'Transport', 1, 'Metro Pass'),
(4, 7200, 'Food', 1, 'Restaurant La Belle'),
(5, 15700, 'Flight', 5, 'IndiGo 6E-231 DEL→GOI'),
(6, 27200, 'Hotel', 5, 'Taj Fort Aguada 4 nights'),
(7, 2400, 'Transport', 5, 'Scooter rental'),
(8, 3800, 'Activity', 5, 'Dudhsagar Falls tour'),
(9, 5500, 'Food', 5, 'Fisherman''s Wharf dinner'),
(10, 3000, 'Food', 5, 'Baga Beach shacks'),
(11, 1800, 'Shopping', 5, 'Anjuna Flea Market souvenirs'),
(12, 57800, 'Flight', 6, 'Emirates EK-508 HYD→DXB'),
(13, 157200, 'Hotel', 6, 'Atlantis The Palm 5 nights'),
(14, 8100, 'Activity', 6, 'Burj Khalifa 148th Floor'),
(15, 10200, 'Activity', 6, 'Desert Safari Premium'),
(16, 80700, 'Flight', 4, 'Delta DL-185 BOM→JFK'),
(17, 93500, 'Hotel', 4, 'The Roosevelt Hotel'),
(18, 85000, 'Hotel', 13, 'Rome Cavalieri Hotel 7 nights voucher'),
(19, 55000, 'Flight', 13, 'Air India AI-121 BOM→FCO group seats'),
(20, 15000, 'Transport', 13, 'Private Vatican & Colosseum Coach'),
(21, 20000, 'Activity', 13, 'Vatican Museums VIP Guided Entry'),
(22, 120000, 'Hotel', 21, 'Kulm Hotel St. Moritz 7 nights'),
(23, 65000, 'Flight', 21, 'Air France XY123 Client Flights'),
(24, 35000, 'Transport', 21, 'Glacier Express 1st Class Rail Pass'),
(25, 25000, 'Activity', 21, 'Matterhorn Alpine Guided Expedition');

-- 2.12 Payments
INSERT INTO Payment (payment_id, amount, payment_date, method, status, booking_id, trip_id, agency_id) VALUES
(1, 72000, '2026-03-05', 'Card', 'Paid', 1, NULL, NULL),
(2, 102000, '2026-03-05', 'Card', 'Paid', 2, NULL, NULL),
(3, 3800, '2026-03-03', 'UPI', 'Pending', 3, NULL, NULL),
(4, 102000, '2026-03-12', 'Card', 'Paid', 4, NULL, NULL),
(5, 136000, '2026-03-12', 'Card', 'Paid', 5, NULL, NULL),
(6, 15700, '2026-02-06', 'UPI', 'Paid', 6, NULL, NULL),
(7, 27200, '2026-02-06', 'Card', 'Paid', 7, NULL, NULL),
(8, 2400, '2026-02-14', 'Cash', 'Paid', 8, NULL, NULL),
(9, 3800, '2026-02-15', 'UPI', 'Paid', 9, NULL, NULL),
(10, 57800, '2026-03-14', 'Card', 'Paid', 10, NULL, NULL),
(11, 157200, '2026-03-14', 'Card', 'Paid', 11, NULL, NULL),
(12, 10200, '2026-03-15', 'UPI', 'Pending', 12, NULL, NULL),
(13, 8100, '2026-03-15', 'Card', 'Paid', 13, NULL, NULL),
(14, 29700, '2026-03-26', 'Card', 'Pending', 14, NULL, NULL),
(15, 61200, '2026-03-26', 'Card', 'Pending', 15, NULL, NULL),
(16, 80700, '2026-03-21', 'Card', 'Paid', 16, NULL, NULL),
(17, 93500, '2026-03-21', 'Card', 'Paid', 17, NULL, NULL),
(18, 175000, '2025-11-01', 'Card', 'Paid', NULL, 13, 1),
(19, 260000, '2026-07-01', 'Card', 'Paid', NULL, 21, 1),
(20, 42000, '2026-04-10', 'Card', 'Paid', 20, NULL, NULL),
(21, 53000, '2026-04-10', 'Card', 'Paid', 21, NULL, NULL);

-- 2.13 Refunds
INSERT INTO Refund (refund_id, payment_id, refund_date, refund_time, refund_status, amount, reason, notes, agency_id) VALUES
(1, 2, '2026-03-06', '14:30:00', 'Processing', 102000, 'Hotel Lumiere booking cancellation', NULL, NULL);

-- 2.14 Reviews
INSERT INTO Review (review_id, trip_id, traveler_id, guide_id, trip_rating, guide_rating, comment, created_at) VALUES
(1, 1, 1, 1, 5, 5, 'Amazing trip! The guide was excellent.', '2026-03-20'),
(2, 5, 4, 1, 5, 4, 'Goa was fantastic! Loved the itinerary.', '2026-02-20'),
(3, 13, 1, 1, 5, 5, 'Rome was unforgettable! Devansh knew all the best local pasta spots.', '2025-12-15'),
(4, 14, 2, 1, 4, 5, 'The Opera House tour was stunning. Great accommodation.', '2026-01-22'),
(5, 15, 3, 1, 5, 5, 'Cape Town was a dream come true. Safaris were well-coordinated.', '2025-11-25'),
(6, 16, 4, 1, 5, 4, 'Loved London, but weather was rainy. Guide was perfect though!', '2025-08-19'),
(7, 17, 1, 2, 5, 5, 'Kyoto the most beautiful place on earth! Mateo was a great host.', '2025-04-15'),
(8, 18, 2, 2, 4, 4, 'Amazing trek up Machu Picchu, definitely worth it.', '2025-10-02'),
(9, 19, 3, 1, 5, 5, 'Exploring the Pyramids in Cairo with Devansh was magical. Best guide!', '2025-10-25'),
(10, 20, 4, 2, 5, 5, 'Saw the Northern Lights! Breathtaking experience.', '2025-01-20');

-- 2.15 Support Tickets
INSERT INTO SupportTicket (ticket_id, case_id, description, issue_type, care_id, priority, status, created, traveler_id, agency_id, trip_id) VALUES
(101, 1, 'Customer booked Hotel Lumiere for 6 nights but confirmation shows only 5 nights.', 'Hotel booking mismatch', 1, 'High', 'In Progress', '2026-03-29T10:00:00', 1, NULL, NULL),
(102, 2, 'Flight cancelled, requesting refund.', 'Flight cancellation refund', 1, 'Medium', 'In Progress', '2026-03-29T07:00:00', 2, NULL, NULL),
(103, 3, 'Payment deducted but not reflecting in bookings.', 'Payment not reflecting', 2, 'High', 'Open', '2026-03-28T10:00:00', 3, NULL, NULL),
(104, 4, 'Desert Safari booking shows wrong date.', 'Booking date correction', 1, 'Medium', 'In Progress', '2026-03-30T09:00:00', 4, NULL, NULL),
(105, 5, 'Inquiry regarding hotel vouchers and airport transfer dispatch for Swiss Alps tour.', 'Booking Discrepancy', 1, 'Medium', 'In Progress', '2026-07-02T11:20:00', NULL, 1, 21);

-- 2.16 Ticket Replies
INSERT INTO TicketReply (ticket_id, reply_id, sender_role, sender_id, sender_name, message, created_at) VALUES
(101, 1, 'traveler', 1, 'Arjun Mehta', 'Customer booked Hotel Lumiere for 6 nights but confirmation shows only 5 nights.', '2026-03-29 10:00:00'),
(101, 2, 'support', 1, 'GlobeSync Support Desk', 'Hello Arjun, we have contacted Hotel Lumiere to ensure your 6th night reservation is confirmed without extra charge.', '2026-03-29 10:35:00'),
(102, 1, 'traveler', 2, 'Kavya Desai', 'Flight cancelled, requesting refund.', '2026-03-29 07:00:00'),
(102, 2, 'support', 1, 'GlobeSync Support Desk', 'Hello Kavya, we have logged your refund claim with our finance desk for processing.', '2026-03-29 08:15:00'),
(103, 1, 'traveler', 3, 'Rohan Varma', 'Payment deducted but not reflecting in bookings.', '2026-03-28 10:00:00'),
(104, 1, 'traveler', 4, 'Nitin Joshi', 'Desert Safari booking shows wrong date.', '2026-03-30 09:00:00'),
(104, 2, 'support', 1, 'GlobeSync Support Desk', 'Hello Nitin, we are updating the tour booking schedule with the Dubai desert operator.', '2026-03-30 09:40:00'),
(105, 1, 'agency', 1, 'Horizon Travel Partners', 'Could you please confirm if the voucher for Hotel Alpenrose in Geneva has been dispatched?', '2026-07-02 11:20:00'),
(105, 2, 'support', 1, 'GlobeSync Support Desk', 'Hello Horizon Travel, the voucher has been generated and dispatched to the hotel partner. Transfer details will arrive within 24 hours.', '2026-07-02 13:45:00');

-- 2.17 Messages
INSERT INTO Message (message_id, sender, sender_id, receiver, receiver_id, content, timestamp) VALUES
(1, 'support', 1, 'traveler', 1, 'Hello Arjun, we are looking into your hotel booking issue.', '2026-03-31T10:00:00'),
(2, 'traveler', 1, 'support', 1, 'Thank you Aisha. I appreciate the help.', '2026-03-31T10:05:00'),
(3, 'traveler', 1, 'guide', 1, 'Hi Devansh! I''m excited about the Paris trip. Can you suggest some local restaurants near the hotel?', '2026-03-28T09:00:00'),
(4, 'guide', 1, 'traveler', 1, 'Hi Arjun! Absolutely — I recommend Le Petit Bistro and Café de Flore. Both are walking distance from Hotel Lumiere.', '2026-03-28T09:15:00'),
(5, 'traveler', 1, 'guide', 1, 'Perfect! Also, is it possible to add a visit to Montmartre on Day 3?', '2026-03-28T10:00:00'),
(6, 'guide', 1, 'traveler', 1, 'Yes, I''ve updated the itinerary. Montmartre is added for Day 3 morning.', '2026-03-28T10:20:00'),
(7, 'traveler', 2, 'guide', 1, 'Hello! I have a question about the Swiss Alps trek difficulty. Is it suitable for beginners?', '2026-03-29T14:00:00'),
(8, 'guide', 1, 'traveler', 2, 'Hi Kavya! The trails I''ve selected are moderate — perfect for beginners with basic fitness.', '2026-03-29T14:30:00'),
(9, 'traveler', 1, 'guide', 2, 'Hi Mateo! Looking forward to the Tokyo trip. Any must-try street food spots?', '2026-03-30T11:00:00'),
(10, 'guide', 2, 'traveler', 1, 'Hey Arjun! You MUST try takoyaki at Dotonbori street and the ramen at Ichiran.', '2026-03-30T11:30:00'),
(11, 'traveler', 3, 'guide', 2, 'Hi Mateo, is the New York itinerary finalized? I''d love to add a Broadway show.', '2026-03-31T08:00:00'),
(12, 'guide', 2, 'traveler', 3, 'Hi Rohan! I''ve reserved tickets for Hamilton on Day 3 evening.', '2026-03-31T08:45:00'),
(13, 'traveler', 4, 'guide', 1, 'Hi Devansh! The Goa trip was amazing. Thank you so much for the Dudhsagar Falls recommendation!', '2026-02-20T16:00:00'),
(14, 'guide', 1, 'traveler', 4, 'So glad you enjoyed it, Nitin! Goa is always magical. Let me know when you''re planning your next adventure!', '2026-02-20T16:30:00'),
(15, 'traveler', 4, 'guide', 2, 'Hi Mateo! For the Dubai trip, can we add a dinner at the Burj Al Arab?', '2026-03-18T09:00:00'),
(16, 'guide', 2, 'traveler', 4, 'Great choice Nitin! I''ll book the Al Muntaha restaurant — 27th floor with stunning views.', '2026-03-18T09:45:00'),
(17, 'traveler', 1, 'guide', 1, 'The Rome trip was breathtaking! Thank you for the incredible historical tour.', '2025-12-15T10:00:00'),
(18, 'guide', 1, 'traveler', 1, 'You''re very welcome, Arjun! Rome has so many stories to tell.', '2025-12-15T11:00:00'),
(19, 'traveler', 2, 'guide', 1, 'Sydney was amazing! The opera house tour was a highlight. Cheers, Devansh!', '2026-01-25T14:30:00'),
(20, 'guide', 1, 'traveler', 2, 'So glad you liked Sydney, Kavya! Australia''s charm is hard to beat.', '2026-01-25T15:00:00'),
(21, 'traveler', 3, 'guide', 1, 'Cape Town was fantastic! The Table Mountain hike was tough but worth it.', '2025-11-25T09:00:00'),
(22, 'guide', 1, 'traveler', 3, 'Powerful sights in Cape Town, Rohan! Glad you enjoyed the hike.', '2025-11-25T10:00:00'),
(23, 'traveler', 1, 'guide', 2, 'Kyoto was magical. The bamboo forest was so peaceful. Thanks, Mateo!', '2025-04-15T12:00:00'),
(24, 'guide', 2, 'traveler', 1, 'Traditional Kyoto is always a soul-stirring experience, Arjun.', '2025-04-15T13:00:00'),
(25, 'traveler', 4, 'guide', 2, 'Iceland was out of this world! The northern lights were better than I imagined.', '2025-01-20T22:00:00'),
(26, 'guide', 2, 'traveler', 4, 'Indeed, Nitin! We were lucky with the clear skies. Nature''s light show at its best!', '2025-01-21T09:00:00');

