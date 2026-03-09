CREATE TABLE Administrator (
    admin_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE Traveler (
    traveler_id INT PRIMARY KEY,
    name VARCHAR(100),
    phone_number VARCHAR(15),
    email VARCHAR(100),
    gender VARCHAR(10),
    age INT
);

CREATE TABLE CustomerCare (
    care_id INT PRIMARY KEY,
    name VARCHAR(100),
    contact VARCHAR(50)
);

CREATE TABLE TravelGuide (
    guide_id INT PRIMARY KEY,
    language VARCHAR(50),
    experience INT,
    contact VARCHAR(50),
    admin_id INT,
    FOREIGN KEY (admin_id) REFERENCES Administrator(admin_id)
);

CREATE TABLE Trip (
    trip_id INT PRIMARY KEY,
    destination VARCHAR(100),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    traveler_id INT,
    guide_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (guide_id) REFERENCES TravelGuide(guide_id)
);

CREATE TABLE Booking (
    booking_id INT PRIMARY KEY,
    booking_date DATE,
    status VARCHAR(20),
    traveler_id INT,
    trip_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

CREATE TABLE Payment (
    payment_id INT PRIMARY KEY,
    amount DECIMAL(10,2),
    payment_date DATE,
    method VARCHAR(30),
    status VARCHAR(20),
    traveler_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id)
);

CREATE TABLE ExternalService (
    service_id INT PRIMARY KEY,
    service_type VARCHAR(50),
    payment_id INT,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id)
);

CREATE TABLE Itinerary (
    itinerary_id INT PRIMARY KEY,
    trip_id INT,
    day_number INT,
    activity VARCHAR(255),
    activity_status VARCHAR(50),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

CREATE TABLE Expenses (
    expenses_id INT PRIMARY KEY,
    date DATE,
    amount DECIMAL(10,2),
    guide_id INT,
    trip_id INT,
    description VARCHAR(255),
    FOREIGN KEY (guide_id) REFERENCES TravelGuide(guide_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

CREATE TABLE SupportTicket (
    ticket_id INT PRIMARY KEY,
    description VARCHAR(255),
    issue_type VARCHAR(50),
    traveler_id INT,
    care_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (care_id) REFERENCES CustomerCare(care_id)
);

CREATE TABLE Refund (
    refund_id INT PRIMARY KEY,
    payment_id INT,
    refund_date DATE,
    refund_time TIME,
    refund_status VARCHAR(20),
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id)
);
