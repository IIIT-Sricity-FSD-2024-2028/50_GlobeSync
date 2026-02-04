## Summary of the Interaction

## Basic Information

    Domain: Travel & Hospitality – Itinerary Planning and Coordination  
    Problem statement: Travel Itinerary Planning and Coordination Platform  
    Date of interaction: 2nd Feb, 2026  
    Mode of interaction: video call  
    Duration (in-minutes): 31 
    Publicly accessible Video link: (https://drive.google.com/file/d/1Ra8hbP-cB71sKpJyG9WCIonaCrUrV_7_/view?usp=sharing)

---

## Domain Expert Details

**Name:** Uda Sri Varshini

**Role/Designation:** Senior Engineer–1, Yatra Online Ltd

**Expertise:** Java Development, Microservices, Travel Platform Systems

**Professional Background:**
The expert is part of the core engineering team at Yatra Online Ltd working on post‑booking and itinerary related microservices. Her work involves hotel booking services,payment gateways and notification systems. She handles scenarios like booking modifications, provider delays, refund workflows.

The discussion was focused on validating the requirements captured in our SRS document and the use cases shown in the system models.


---
## Domain Context and Terminology
Overall purpose of this problem statement in our daily work:
The purpose of the Travel Itinerary Planning and Coordination Platform is to manage a trip after checking service availability and keep all stakeholders connected in one place. In daily work, this involves creating travel plans, coordinating between traveler, guide, transport and hotel providers, tracking confirmations, and responding to changes like delays or cancellations. The platform acts as a central system that keeps the itinerary updated and visible to everyone involved.

Primary goals or outcomes of this problem statement:
The primary goals are to provide a clear and organized itinerary, ensure smooth coordination between all actors, reduce confusion when plans change, and improve traveler experience. From a practical perspective, the platform should minimize manual communication, avoid double bookings, and help users complete their trips without disruption.

| Term               | Practical Meaning                                                       |
| ------------------ | ----------------------------------------------------------------------- |
| Itinerary          | Central record combining destinations, hotels, transport and activities |
| Coordination       | Two‑way communication between traveler, guide and providers             |
| External Services  | Payment, booking APIs, maps ,weather and notification systems                    |
| Exception Handling | Managing delays, cancellations, refund requests                         |

---
## Actors and Responsibilities

| Actor | Responsibilities |
|------|------------------|
| Traveler | Create itinerary based on service availability, view trip details, receive notifications, raise issues |
| Travel Guide | Suggest routes and timings, coordinate with traveler, update activities |
| External Services | Provide transport, hotel, nofitication, maps and weather system|
| Customer Care | Handle cancellations, refunds, rescheduling, resolve user complaints |
| Administrator | Manage all actors, manage database, view system reports, generate analytics |


## Meaning of Major Use cases

1.Create Itinerary – This means the traveler builds a plan based on every service availability (transport, stay, activities) and the system saves it as a structured plan before final confirmation. It is final booking,not just creating a travel plan.

2.Coordinate with Guide – The guide looks at the plan, suggests better routes or timings, and talks with the traveler through messages or calls inside the platform.

3.Exception Handling – When any problem happens (delay, cancellation, refund), the traveler raises a request and customer care helps to solve it.

---

The expert mapped her feedback:

* Use Case Diagram correctly identifies core interactions.

* Non‑functional requirements about security and availability are essential for payment handling.

---
## Core Workflows

### Workflow 1: Itinerary Creation & Confirmation
**Trigger:** Traveler creates a new trip based on service availability.

**Steps:**
- Traveler submits itinerary with selected transport and stay options 
- External Services validate availability of transport and accommodation  
- System updates itinerary status after payment and notifies all actors  

**Outcome:**  
A confirmed itinerary visible to traveler, guide and customer care.

---

### Workflow 2: Change / Exception Handling

**Trigger:**  
A change occurs such as delay, cancellation, or user modification request.

**Steps:**
- Traveler or Guide raises a support ticket with reason and details  
- System validates request against provider policies  
- Customer Care receives notification and performs review  
- External Services update booking details and send revised confirmation  

**Outcome:**  
The itinerary is reviewed at multiple levels and updated safely without risk to the traveler.

---

### Workflow 3: Guide Coordination During Trip

**Trigger:** Trip is in progress.

**Steps:**
- Guide shares real-time suggestions and activity updates  
- Traveler approves or requests changes  
- System records communication and notifies relevant services  

**Outcome:**  
Smooth execution of trip with continuous coordination.

---

## Rules, Constraints and Real‑World Insights

* Provider confirmation must precede payment finalization.
* Platform should depend on external booking APIs instead of storing inventory.
* Every change must generate notification to all actors.
* Logs are important for dispute resolution.

---

## Challenges Highlighted

* Synchronizing data from multiple third‑party services.
* Maintaining single source of truth for itinerary.
* Handling partial failures (payment success but booking failure).

---

## Impact on Our Project

Based on the interaction we decided to:

* Keep actors exactly as in SRS use case diagram.
* Strengthen Guide Coordination Module.
* Treat booking as external service.
* Add support ticket and notification flows in activity diagrams.

The interaction validated that our SRS structure, actors and use cases are aligned with real industry practices and suitable for academic implementation.
