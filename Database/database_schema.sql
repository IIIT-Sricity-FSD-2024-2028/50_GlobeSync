
CREATE TABLE Administrator (
    admin_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE Traveler (
    traveler_id INT PRIMARY KEY,
    name VARCHAR(100),
    phonenumber VARCHAR(15),
    email VARCHAR(100),
    gender VARCHAR(10),
    age INT
);

CREATE TABLE CustomerCare (
    care_id INT PRIMARY KEY,
    name VARCHAR(100),
    contact VARCHAR(15)
);

CREATE TABLE TravelGuide (
    guide_id INT PRIMARY KEY,
    name VARCHAR(100),
    language VARCHAR(50),
    experience INT,
    contact VARCHAR(15)
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

CREATE TABLE Itinerary (
    itinerary_id INT PRIMARY KEY,
    trip_id INT,
    day_number INT,
    activity VARCHAR(200),
    activity_status VARCHAR(50),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

CREATE TABLE Booking (
    booking_id INT PRIMARY KEY,
    booking_date DATE,
    status VARCHAR(50),
    traveler_id INT,
    trip_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

CREATE TABLE ExternalService (
    service_id INT PRIMARY KEY,
    service_type VARCHAR(100),
    payment_id_id INT,
    FOREIGN KEY (payment_id) REFERENCES Payment(payment_id)
);

CREATE TABLE Payment (
    payment_id INT PRIMARY KEY,
    amount DECIMAL(10,2),
    payment_date DATE,
    method VARCHAR(50),
    status VARCHAR(50),
    traveler_id INT,
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id)
);

CREATE TABLE Refund (
  refund_id INT PRIMARY KEY,
  payment_id INT,
  refund_date DATE,
  refund_time TIME,
  refund_status VARCHAR(50),
  FOREIGN KEY (payment_id) REFERENCES Payment(payment_id));

CREATE TABLE Expense (
    expense_id INT PRIMARY KEY,
    date DATE,
    budget DECIMAL(10,2),
    guide_id INT,
    trip_id INT,
    FOREIGN KEY (guide_id) REFERENCES TravelGuide(guide_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

CREATE TABLE SupportTicket (
    ticket_id INT PRIMARY KEY,
    care_id INT,
    traveler_id INT,
    description TEXT,
    issue_type VARCHAR(100),
    FOREIGN KEY (care_id) REFERENCES CustomerCare(care_id),
    FOREIGN KEY (traveler_id) REFERENCES Traveler(traveler_id)
);
