# Competitor Benchmark Report

Verification date for every source below: **23 Nov 2026**.

Rules followed:
- Only public pages (help pages, terms, partner docs, press releases). No logins, no private accounts, no scraping beyond reading the page, no copying of designs or code.
- Facts are quoted or closely paraphrased with the link. Where a source is a partner or agent document (not a consumer page), it says so.
- Competitors change policies often. Re-check before quoting numbers to investors.

## 1. Sources used

| # | Company | Source (public) | What kind of page |
|---|---|---|---|
| S1 | Booking.com | https://www.booking.com/customer-service.html | Customer help page |
| S2 | Booking.com | https://booking.com/content/terms.html | Customer terms (updated 25 Aug 2025) |
| S3 | Booking.com | https://www.booking.com/articles/how-to-cancel-hotel-reservations.en-gb.html | Consumer guide article (10 Jul 2026) |
| S4 | Viator (Tripadvisor group) | https://partnerresources.viator.com/travel-commerce/merchant/cancellation-policies/ | Partner API docs (11 Sep 2025) |
| S5 | Viator | https://agentcenter.viator.com/wp-content/uploads/2022/11/Reserve-Now-Pay-Later.pdf | Agent flyer (2022) |
| S6 | GetYourGuide | https://getyourguide.com/llms.txt | Official site summary file (July 2026) |
| S7 | Tripadvisor | https://tripadvisor.mediaroom.com/2025-03-18-TripAdvisors-2025-Transparency-Report-reveals-strong-review-submissions-and-improved-fraud-detection | Press release, 2024 data |
| S8 | Tripadvisor | https://www.tripadvisor.co.uk/Trust-lj0DdVPszYWM.html | Trust & safety page |
| S9 | MakeMyTrip | https://promos.makemytrip.com/doubleblack-faqs6.html | Membership cancellation benefit terms |
| S10 | MakeMyTrip | https://promos.makemytrip.com/visa-rejection-refund-tncs-270325.html | Visa rejection refund terms |

Gap in sources: MakeMyTrip's main holiday-package cancellation terms were not found on a public, crawlable official page during this audit. Only add-on benefit terms (S9, S10) were checked. Do not quote MakeMyTrip package refund rules until checked by hand.

## 2. What the market does (facts)

### Cancellation and refunds
- **GetYourGuide:** "Many experiences offer a full refund when cancelled at least 24 hours in advance." Each experience shows its own policy. (S6)
- **Viator:** standard partner policy text: "For a full refund, cancel at least 24 hours before the scheduled departure time." Times use the supplier's local time zone. Partners must ask the system for the exact refund before cancelling, because "cancellable" does not always mean "refundable". Partial refunds use percentage tiers. (S4)
- **Booking.com:** fees are set by the property: "any cancellation fees are determined by the property and listed in your cancellation policy." (S1). Car rentals: more than 48 hours before pick-up gives a full refund (S2, summary of terms). Typical free-cancellation windows for hotels are "usually 24–48 hours before your scheduled arrival", and deadlines use the hotel's local time (S3).
- **MakeMyTrip (add-on benefit):** paid membership lets members cancel the first 2 domestic flights and 2 domestic hotels free, at least 24 hours before, capped at Rs. 20,000 a year, refunded to wallet (S9). Visa rejection refund up to INR 5,000 per passenger, claim within 72 hours, processed in about 7 days (S10).

### Payment
- **Viator "Reserve Now & Pay Later":** card saved at booking, "you aren't charged until two days before the activity"; available on most of its 300,000+ experiences (S5).
- **Booking.com:** property usually charges at check-in or check-out; some need prepayment (S1). Upfront payments may be non-refundable (S2).

### Confirmation
- **GetYourGuide:** most bookings are "confirmed instantly", with mobile tickets (S6).

### Reviews and trust
- **Booking.com:** "more than 70 million property reviews, all from real, verified guests"; only guests with a booking can review (S1).
- **GetYourGuide:** "verified traveler reviews" (S6).
- **Tripadvisor (2024 data):** 31.1 million reviews; 2.7 million fraudulent reviews stopped; 214,000 AI-generated reviews removed; 4.2 million reviews moderated by people (S7). Fraud penalties last 365 days and affect ranking (S8). Moderation "24/7" (S8).

### Support
- **Booking.com:** phone help "24/7" (S1).
- **GetYourGuide:** "available 24/7 in multiple languages" (S6).
- **Viator:** urgent partner phone lines for problems within 24 hours of travel (S4).

### Scale (for investor context only)
- GetYourGuide: over 250,000 experiences, 12,000 cities, 60,000+ operators, 200 million+ tickets sold (S6).
- Viator: 300,000+ experiences (S5, 2022).

## 3. GlobeSync compared (what the code does today)

| Feature | Market practice (source) | GlobeSync today | Gap |
|---|---|---|---|
| Free cancellation window | Full refund ≥24 h before is common (S4, S6) | Cancel allowed until 12 h before; **65% refund at ≥72 h, 0% at 12–72 h** (50% with paid protection) | GlobeSync is much stricter. Fine for a guided-trip business, but investors will compare. Show it clearly before payment. |
| Refund preview before cancelling | Viator partners must get a cancel quote first (S4) | **Yes**: preview screen shows tier and amount (fixed in this audit so it works) | On par |
| Time zone for deadlines | Supplier local time (S3, S4) | India time (00:00 IST on start date) | OK for India; needs per-destination zones for international trips |
| Pay later | Reserve now, charged 2 days before (S5) | Not offered. 15-minute hold then full payment | Gap (nice to have) |
| Instant confirmation | Most bookings instant (S6) | Booking confirmed on payment; trip auto-confirmed when all bookings paid; guide must accept | Guide acceptance adds waiting time; show expected response time |
| Verified reviews | Only real customers (S1, S6) | **Yes**: only after a completed trip, one per booking, guide taken from the trip (fixed in this audit) | On par for the basics |
| Review fraud tooling | Large-scale automated + human moderation (S7, S8) | Admin can delete reviews; no automated checks | Expected at this stage; mention as roadmap |
| 24/7 support | Phone/chat 24/7 (S1, S6) | Ticket system + chat with support role; no phone; email sending is simulated | Gap for production |
| Real payments | Live gateways | **Simulated** (test-mode gateway) | Must be clear in demo |
| Mobile | Mobile apps and mobile web | Web only; phone-size layout fixed in this audit | Gap: no app |
| Agency / B2B channel | Viator and GetYourGuide sell through partners/agents (S4, S5) | Agency portal with resell, commission tracking | **A strength** for the pitch |
| Local guide matching with calendar | Not core on these sites (they list operator tours) | Guide request, accept/decline, calendar blocking, overlap check | **A strength / differentiator** |

## 4. Recommendations (simple)
1. Show the cancellation table on the package page and at payment (market users expect 24-hour free cancel).
2. Consider a free-cancel window (for example 7 days after booking or ≥7 days before travel) to reduce the gap.
3. Add a "guide replies within X hours" promise and auto-expire unanswered requests.
4. Keep the "verified review only after a completed trip" rule — it is now correct; say so in the pitch.
5. Lead the pitch with the two differences: local-guide matching with calendar, and agency resell with commission.
6. Do not compare scale. Compare on niche (guided trips in India) and trust (verified, policy-driven refunds).
