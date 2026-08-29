CREATE DATABASE travel_booking;
USE travel_booking;

-- ================= ADMIN =================
CREATE TABLE Administrator (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

-- ================= TRAVELER =================
CREATE TABLE Traveler (
    traveler_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    gender VARCHAR(10),
    age INT
);

-- ================= PACKAGE (PREPLANNED) =================
CREATE TABLE Package (
    package_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    destination VARCHAR(100),
    price DECIMAL(10,2),
    admin_id INT,
    FOREIGN KEY (admin_id) REFERENCES Administrator(admin_id)
);

-- ================= PACKAGE BOOKING =================
CREATE TABLE PackageBooking (
    packagebooking_id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT,
    traveler_id INT,
    booking_date DATE,
    status VARCHAR(50),
    total_amount DECIMAL(10,2),
    FOREIGN KEY (package_id) REFERENCES Package(package_id),
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id)
);

-- ================= CUSTOM TRIP =================
CREATE TABLE CustomTrip (
    custom_trip_id INT AUTO_INCREMENT PRIMARY KEY,
    traveler_id INT,
    destination VARCHAR(100),
    budget DECIMAL(10,2),
    preferences TEXT,
    created_at DATE,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id)
);

-- ================= TRAVEL GUIDE =================
CREATE TABLE TravelGuide (
    guide_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    language VARCHAR(50),
    experience INT,
    contact VARCHAR(50)
);

-- ================= TRIP (ACTUAL EXECUTION) =================
CREATE TABLE Trip (
    trip_id INT AUTO_INCREMENT PRIMARY KEY,
    destination VARCHAR(100),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    traveler_id INT,
    guide_id INT,
    package_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (guide_id) REFERENCES TravelGuide(guide_id),
    FOREIGN KEY (package_id) REFERENCES Package(package_id)
);

-- ================= ITINERARY =================
CREATE TABLE Itinerary (
    itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT,
    day_number INT,
    activity TEXT,
    activity_status VARCHAR(50),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

-- ================= EXPENSES =================
CREATE TABLE Expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10,2),
    type VARCHAR(50),
    trip_id INT,
    description TEXT,
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

-- ================= PAYMENT =================
CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10,2),
    payment_date DATE,
    method VARCHAR(50),
    status VARCHAR(50),
    packagebooking_id INT,
    FOREIGN KEY (packagebooking_id) REFERENCES PackageBooking(packagebooking_id)
);

-- ================= EXTERNAL SERVICES =================
CREATE TABLE ExternalService (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_type VARCHAR(100),
    provider_name VARCHAR(100),
    payment_id INT,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id)
);

-- ================= REFUND =================
CREATE TABLE Refund (
    refund_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT,
    refund_date DATE,
    refund_amount DECIMAL(10,2),
    refund_status VARCHAR(50),
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id)
);

-- ================= REVIEW =================
CREATE TABLE Review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    rating INT,
    comment TEXT,
    traveler_id INT,
    trip_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

-- ================= CUSTOMER CARE =================
CREATE TABLE CustomerCare (
    care_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    contact VARCHAR(50)
);

-- ================= SUPPORT TICKET =================
CREATE TABLE SupportTicket (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_description TEXT,
    issue_type VARCHAR(50),
    status VARCHAR(50),
    traveler_id INT,
    care_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (care_id) REFERENCES CustomerCare(care_id)
);

-- =================================================================================
-- AGENCY EXTENSION — added in Review-2 design stage
-- The three tables below extend the schema for the B2B reseller (Agency) feature.
-- Existing tables above are unmodified; agency_id FKs are added via ALTER at bottom.
-- =================================================================================

-- ================= AGENCY =================
CREATE TABLE Agency (
    agency_id       INT AUTO_INCREMENT PRIMARY KEY,
    business_name   VARCHAR(100),
    contact_email   VARCHAR(100),
    contact_phone   VARCHAR(20),
    password        VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'pending',
    commission_rate DECIMAL(5,2),
    created_at      DATE
);
-- status values: 'pending' | 'approved' | 'rejected'

-- ================= PASSENGER =================
-- Generalises the SavedPassenger concept to support both B2C and B2B ownership.
-- CONSTRAINT: exactly one of (traveler_id, agency_id) must be non-null per row.
--   traveler_id set  -> passenger belongs to a registered Traveler (B2C self-booking)
--   agency_id   set  -> passenger is an offline client owned by an Agency (B2B booking)
CREATE TABLE Passenger (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100),
    age          INT,
    gender       VARCHAR(10),
    contact      VARCHAR(50),
    traveler_id  INT NULL,
    agency_id    INT NULL,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (agency_id)   REFERENCES Agency(agency_id)
);

-- ================= COMMISSION LEDGER =================
-- One row per Agency booking. Created automatically by the backend when a
-- trip with agencyId is confirmed (TripsService.create).
-- status lifecycle: 'pending' (trip active) → 'settled' (trip marked Completed)
--   The transition is applied automatically in TripsService.updateStatus.
CREATE TABLE CommissionLedger (
    commission_id INT AUTO_INCREMENT PRIMARY KEY,
    agency_id     INT NOT NULL,
    trip_id       INT NOT NULL,
    amount        DECIMAL(10,2),
    status        VARCHAR(20) DEFAULT 'pending',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES Agency(agency_id),
    FOREIGN KEY (trip_id)   REFERENCES Trip(trip_id)
);

-- =================================================================================
-- ALTER EXISTING TABLES — add nullable agency_id FK column
-- Run these after the CREATE statements above.
-- When agency_id is set, traveler_id on the same row may be NULL
-- (the Agency is the commercial owner; the Passenger record holds the traveler detail).
-- =================================================================================

-- ALTER TABLE Trip
--     ADD COLUMN agency_id INT NULL,
--     ADD FOREIGN KEY (agency_id) REFERENCES Agency(agency_id);

-- ALTER TABLE SupportTicket
--     ADD COLUMN agency_id INT NULL,
--     ADD FOREIGN KEY (agency_id) REFERENCES Agency(agency_id);
-- NOTE: traveler_id on SupportTicket becomes nullable when agency_id is set
--       since the Agency is the platform's sole support contact for its passengers.
