# GlobeSync — Traveler Module React Evaluation & Viva Guide

This guide is designed for your individual React evaluation. It details the actual components, file paths, state ownership, lifecycle hooks, and architectural decisions of the **Traveler** portal.

---

## 1. Architectural Philosophy & Evaluation Pitch

When asked about the architectural design of the Traveler module, explain:
> *"The Traveler module is built using standard React 18 functional components, declarative JSX, and vanilla CSS tokens without third-party state managers like Redux or generic form builders. Feature state is kept strictly local to the pages that own the business records. Global authentication and session identity are managed through a lightweight React Context (`SessionContext`). All network requests communicate with the NestJS REST backend using standard `fetch` with `AbortController` cancellation to prevent race conditions and memory leaks."*

---

## 2. Directory Structure & Actual Component Paths

```text
front-end/src/
├── App.jsx                               # Application router and role-based route definitions
├── context/
│   └── SessionContext.jsx               # Global user session (user, role, token, updateUser, logout)
├── layouts/
│   └── DashboardLayout.jsx              # Shell layout with Sidebar, Topbar, and <Outlet />
├── services/
│   └── api.js                           # Centralized API layer; injects x-user-role and x-user-id
├── styles/
│   └── shared.css                       # Design tokens, color palette, buttons, cards, and modal utilities
├── pages/traveler/
│   ├── TravelerDashboardPage.jsx        # Summary overview (trips, bookings, expenses, support counts)
│   ├── TravelerPackagesPage.jsx         # Tour package catalog browsing with search and modal preview
│   ├── TravelerTripsPage.jsx            # Trips management and daily itinerary scheduler
│   ├── TravelerCreateTripPage.jsx       # Multi-step wizard for custom/package trip planning
│   ├── TravelerBookingsPage.jsx         # Bookings list, financial metrics, and payment modal
│   ├── TravelerExpensesPage.jsx         # On-trip spending tracker with CSV export and category breakdown
│   ├── TravelerMessagesPage.jsx         # Real-time coordination chat with guides and support desk
│   ├── TravelerSupportPage.jsx          # Ticket submission, linked booking references, and helpdesk FAQ
│   └── TravelerProfilePage.jsx          # Profile details, password reset, and saved co-traveler list
└── components/
    ├── common/
    │   ├── StatusBadge.jsx              # Color-coded pill badge (Pending, Confirmed, Cancelled)
    │   └── Toast.jsx                    # Temporary feedback banner
    ├── trips/
    │   ├── TripFilterBar.jsx            # Search input and status filter pills
    │   ├── ActiveTripHeader.jsx         # Selected trip header banner with quick actions
    │   ├── TripList.jsx                 # Grid of trip cards
    │   ├── TripEditModal.jsx            # Controlled modal for editing trip destination/dates/budget
    │   ├── TripForm.jsx                 # Multi-step wizard container (Steps 0 through 6)
    │   ├── TripCreationSuccessView.jsx  # Truthful confirmation view with linked booking IDs
    │   ├── TripSubmissionRecoveryBanner.jsx # Recovery banner for interrupted submissions
    │   └── tripCalculations.js          # Pure calculation helper for transit, hotel, and protection costs
    ├── itineraries/
    │   ├── ItineraryList.jsx            # Timeline of daily itinerary activities with RBAC guards
    │   └── ItineraryForm.jsx            # Controlled add/edit activity form
    ├── bookings/
    │   ├── BookingStats.jsx             # 4 KPI cards (Total, Rupee Volume, Confirmed, Pending)
    │   ├── BookingList.jsx              # Table of reserved transport and accommodation bookings
    │   ├── PaymentModal.jsx             # Payment processing modal with card/UPI inputs and gateway notice
    │   └── BookingDetailModal.jsx       # Transaction history ledger and refund requests
    ├── expenses/
    │   ├── ExpenseStats.jsx             # Category breakdown progress bars and accounting scope notice
    │   ├── ExpenseList.jsx              # Table of itemized expenses
    │   └── ExpenseFormModal.jsx         # Controlled form modal for logging an expense
    ├── messages/
    │   ├── ConversationList.jsx         # Left-hand contact sidebar with search filter
    │   ├── MessageThread.jsx            # Chronological message stream with bubbles and timestamps
    │   └── MessageInput.jsx             # Controlled input with draft preservation and duplicate prevention
    ├── support/
    │   ├── TicketList.jsx               # Table of traveler support tickets with status tags
    │   └── TicketForm.jsx               # Controlled form for raising support issues linked to bookings
    └── passengers/
        ├── PassengerList.jsx            # Cards of saved co-traveler companions
        └── PassengerFormModal.jsx       # Controlled modal for adding/editing passenger records
```

---

## 3. Core React Concepts — Plain-Language Explanations

### Concept 1: State Ownership
* **Definition**: State should live in the lowest common ancestor component that needs it.
* **In GlobeSync**:
  - `TravelerTripsPage` owns the `trips` array, the `selectedTrip` object, and the `itineraries` array.
  - `TripFilterBar` does **not** own the trips list; it simply receives `searchQuery` and `statusFilter` as props and invokes parent callbacks when changed.
  - `PaymentModal` owns temporary form input state (`cardNumber`, `expiry`, `cvv`), but reports the final confirmed booking up to `TravelerBookingsPage`.

### Concept 2: Props and Callback Functions
* **Definition**: Data flows **down** via props; notifications flow **up** via callbacks.
* **In GlobeSync**:
  ```jsx
  // Parent (TravelerBookingsPage.jsx)
  <PaymentModal
    isOpen={Boolean(payingBooking)}
    booking={payingBooking}
    onPaymentSuccess={handlePaymentSuccess}  // <-- Callback prop
    onClose={() => setPayingBooking(null)}    // <-- Callback prop
  />
  ```
  When the backend confirms payment, `PaymentModal` calls `onPaymentSuccess(updatedBooking, paymentRecord)`. The parent executes an **immutable update**:
  ```javascript
  setBookings(prev => prev.map(b => b.bookingId === updatedBooking.bookingId ? updatedBooking : b));
  ```

### Concept 3: Controlled Forms
* **Definition**: An input whose value is bound to React state (`value={state}`) and updated via an `onChange` event handler.
* **Why it matters**: React remains the single source of truth. Form values cannot get out of sync with application logic.
* **Example in `ItineraryForm.jsx`**:
  ```jsx
  <input
    type="text"
    value={formData.activity}
    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
  />
  ```

### Concept 4: Side Effects and Lifecycle (`useEffect`)
* **Definition**: Performing operations like data fetching, subscriptions, or DOM updates outside of render.
* **Critical Practice in GlobeSync**:
  1. **Unconditional Hook Execution**: Hooks are never called conditionally or inside loops.
  2. **Cleanup with `AbortController`**: When a page unmounts or selected ID changes rapidly, in-flight HTTP requests are aborted:
  ```javascript
  useEffect(() => {
    const controller = new AbortController();
    loadTrips(controller.signal);
    return () => controller.abort(); // Cleanup on unmount or re-run
  }, [travelerId]);
  ```
  3. **URL Synchronization**: In `TravelerTripsPage`, an effect synchronizes `selectedTrip` with `searchParams.get('tripId')`, ensuring that browser refresh and back/forward navigation restore the active trip.

### Concept 5: Role-Based Authorization & Session Context
* **Definition**: The backend uses `RolesGuard` to inspect the `x-user-role` and `x-user-id` headers.
* **In GlobeSync**:
  `SessionContext.jsx` stores the logged-in user (`user`) and role (`role`). The API layer (`api.js`) reads from session storage and automatically injects these headers on every outbound request:
  ```javascript
  headers['x-user-role'] = user.role;
  headers['x-user-id'] = user.id;
  ```

---

## 4. Key Workflows Explained

### Workflow A: Package Selection → Trip Creation → Bookings & Payment
1. **Selection**: User clicks "Select Package" in `/traveler/packages`. The router navigates to `/traveler/plan?packageId=1`.
2. **Pre-population**: `TravelerCreateTripPage` reads the URL parameter, pre-fills package destination, dates, hotel, and calculated rates.
3. **Step Tracking & Trip-Creation Recovery**:
   - The user advances through wizard steps.
   - On final submit (`handleSubmit`), the page creates the trip (`POST /trips`), then creates transport & hotel bookings (`POST /bookings`), and sends a message to the assigned guide (`POST /messages`).
   - Transport booking amount is persisted as `Math.round(costData.totalTransportBooking)` (including base fare, compulsory travel insurance, and optional cancellation protection).
   - If an intermediate booking fails, the trip ID and state are persisted in `sessionStorage` (`globesync_pending_trip_submission`) and a `TripSubmissionRecoveryBanner` appears, allowing the traveler to retry missing bookings without re-creating the trip.
4. **Checkout (`PaymentModal`)**: The user navigates to `/traveler/bookings` and clicks "Pay Now" on a pending booking.
5. **Gateway Simulation & Card Validation**:
   - Card authorization is explicitly simulated (demo card: `4532 0123 4567 8910`, `12/28`, `123` with "Use Demo Card Details" quick-fill).
   - `validateExpiryDate()` validates real `MM/YY` structure, month range (`01`–`12`), and verifies that the card has not expired relative to the current month/year.
   - Closing or switching the modal (via backdrop, '✕' button, cancel, or Escape key) is strictly blocked while `isProcessing` is active to prevent misleading partial states.
6. **Paid Record Recovery vs. New Payment**:
   - On opening and before creating a payment, `PaymentModal` queries `GET /payments/booking/:id` to check if a `Paid` record already exists in the backend ledger.
   - **Recovery Rule**: If an existing `Paid` record is found, the modal enters **Recovery Mode**:
     - It uses the recorded payment's amount and details rather than re-charging.
     - The cancellation protection toggle is locked to match the recorded transaction, preventing silent modifications to booking amount or protection selection.
     - Submitting recovers the payment and confirms the booking (`PUT /bookings/:id`).
   - **Duplicate Prevention**: If a new payment is submitted concurrently or already exists, the backend duplicate check rejects double charges, and `PaymentModal` recovers the existing record.
7. **Trip Status FSM Synchronization & Partial Success State**:
   - Only when **all** bookings for the trip are confirmed does the trip transition to `Confirmed`.
   - Adheres to the backend Finite State Machine: If the trip is in `Planning`, it transitions `Planning` $\rightarrow$ `Pending` $\rightarrow$ `Confirmed`.
   - `guideStatus` is kept separate and untouched.
   - **Partial Success Recovery**: If payment and booking are confirmed but trip status update encounters a failure, the modal enters a **Partial Success** view:
     - Clear warning explaining the trip status issue.
     - Guarantees that payment is safe and no repeat payment will be made.
     - Offers a "Retry Trip Confirmation" button (both in `PaymentModal` and on `TravelerBookingsPage`) that re-attempts trip confirmation *without ever re-recording payment*.

### Workflow B: Managing Daily Itineraries
1. In `/traveler/trips`, clicking a trip updates the URL to `?tripId=1`.
2. `TravelerTripsPage` triggers an effect that calls `itinerariesApi.getByTrip(1)`.
3. Adding an activity opens `ItineraryForm`. Submitting calls `POST /itineraries`.
4. The parent appends the new activity to `itineraries` state immutably: `setItineraries(prev => [...prev, savedItem])`.
5. Deleting an activity triggers `DELETE /itineraries/:id`. The frontend checks user role: if traveler, the delete button is hidden or an informative explanation of backend `RolesGuard` restrictions is shown.

---

## 5. Five Live-Modification Exercises (Viva Preparation)

During a viva, an examiner might ask you to make a small change live. Here are 5 realistic tasks and their exact solutions:

### Exercise 1: Add a Quick Filter in `TravelerTripsPage.jsx`
* **Task**: Add a button that filters trips with a budget greater than ₹50,000.
* **File**: `front-end/src/pages/traveler/TravelerTripsPage.jsx`
* **Solution**:
  1. In the filter logic (around line 145), add:
     ```javascript
     const [highBudgetOnly, setHighBudgetOnly] = useState(false);
     ```
  2. Include it in `filteredTrips`:
     ```javascript
     const filteredTrips = trips.filter((t) => {
       // ... existing filters ...
       const matchesBudget = !highBudgetOnly || Number(t.budget) >= 50000;
       return matchesStatus && matchesSearch && matchesBudget;
     });
     ```
  3. Render a toggle button in the header or `TripFilterBar`:
     ```jsx
     <button
       type="button"
       onClick={() => setHighBudgetOnly(!highBudgetOnly)}
       className={`btn ${highBudgetOnly ? 'btn-primary' : 'btn-secondary'}`}
     >
       {highBudgetOnly ? '★ High Budget (₹50k+)' : 'Show All Budgets'}
     </button>
     ```

### Exercise 2: Add Character Count to `MessageInput.jsx`
* **Task**: Show how many characters the traveler has typed out of 500 max.
* **File**: `front-end/src/components/messages/MessageInput.jsx`
* **Solution**:
  1. Inside `MessageInput`, below the `<input>` element:
     ```jsx
     <div style={{ fontSize: '11px', color: (value || '').length > 450 ? '#dc2626' : 'var(--muted)', marginTop: '4px' }}>
       {(value || '').length} / 500 characters
     </div>
     ```
  2. Add `maxLength={500}` to the input tag.

### Exercise 3: Add an Extra Stat Card to `BookingStats.jsx`
* **Task**: Display a new card showing the count of Cancelled Bookings.
* **File**: `front-end/src/components/bookings/BookingStats.jsx`
* **Solution**:
  1. Add `cancelledCount = 0` to component props.
  2. In `TravelerBookingsPage.jsx`, derive `cancelledCount`:
     ```javascript
     const cancelledCount = bookings.filter((b) => b.status === 'Cancelled').length;
     ```
  3. Pass `cancelledCount={cancelledCount}` to `<BookingStats />`.
  4. In `BookingStats.jsx`, add a 5th card:
     ```jsx
     <div className="kpi-card">
       <span className="kpi-label">Cancelled</span>
       <div className="kpi-value" style={{ color: '#ef4444' }}>{cancelledCount}</div>
       <div className="kpi-subtext">Voided reservations</div>
     </div>
     ```

### Exercise 4: Add an Input Field to `PassengerFormModal.jsx`
* **Task**: Add an "Emergency Contact Phone" field.
* **File**: `front-end/src/components/passengers/PassengerFormModal.jsx`
* **Solution**:
  1. In `useState`, add `emergencyPhone: passenger?.emergencyPhone || ''`.
  2. Add input JSX:
     ```jsx
     <div className="form-group">
       <label className="form-label">Emergency Contact Phone</label>
       <input
         type="tel"
         className="form-control"
         placeholder="+91 98765 00000"
         value={formData.emergencyPhone}
         onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
       />
     </div>
     ```
  3. Include `emergencyPhone: formData.emergencyPhone` in the submission payload passed to `onSave`.

### Exercise 5: Add a Priority Badge in `TicketList.jsx`
* **Task**: Render a distinct visual badge for "High" priority support tickets.
* **File**: `front-end/src/components/support/TicketList.jsx`
* **Solution**:
  1. In the ticket rendering loop, inspect `ticket.priority`:
     ```jsx
     <span
       style={{
         padding: '3px 8px',
         borderRadius: '6px',
         fontSize: '11px',
         fontWeight: 700,
         background: ticket.priority === 'High' ? '#fef2f2' : '#f3f4f6',
         color: ticket.priority === 'High' ? '#dc2626' : '#4b5563',
         border: ticket.priority === 'High' ? '1px solid #fecaca' : 'none',
       }}
     >
       {ticket.priority === 'High' ? '🔥 HIGH PRIORITY' : ticket.priority}
     </span>
     ```

---

## 6. Summary Checklist Before Viva
- [x] Run `npm run build` in `front-end` (must succeed with zero errors).
- [x] Backend running on `http://localhost:3000`.
- [x] Login tested with `arjun.mehta@example.com` / `Traveler@123`.
- [x] Understand state ownership (Pages own server data; modals/forms own user input).
- [x] Know how `AbortController` in `useEffect` prevents stale data.
- [x] Know why `roles.guard.ts` rejects traveler deletion of activities and expenses (RBAC).
