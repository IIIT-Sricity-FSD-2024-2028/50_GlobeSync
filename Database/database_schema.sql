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
