import { Injectable } from '@nestjs/common';
import {
  travelers,
  admins,
  supportUsers,
  guides,
  trips,
  bookings,
  payments,
  refunds,
  packages,
  itineraries,
  expenses,
  reviews,
  supportTickets,
  messages,
  savedPassengers,
  packageBookings,
} from '../data';

@Injectable()
export class DashboardService {
  /** Admin dashboard — high-level business metrics */
  getAdminDashboard() {
    const totalRevenue = payments
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalTrips: trips.length,
      totalBookings: bookings.length,
      totalPackages: packages.length,
      totalGuides: guides.length,
      totalTravelers: travelers.length,
      pendingBookings: bookings.filter((b) => b.status === 'Pending').length,
      completedTrips: trips.filter((t) => t.status === 'Completed').length,
      revenueEstimate: totalRevenue,
    };
  }

  /** Superuser dashboard — system-wide overview */
  getSuperuserDashboard() {
    return {
      usersByRole: {
        travelers: travelers.length,
        guides: guides.length,
        admins: admins.length,
        supportUsers: supportUsers.length,
      },
      entitiesCount: {
        travelers: travelers.length,
        guides: guides.length,
        admins: admins.length,
        supportUsers: supportUsers.length,
        packages: packages.length,
        trips: trips.length,
        bookings: bookings.length,
        payments: payments.length,
        refunds: refunds.length,
        itineraries: itineraries.length,
        expenses: expenses.length,
        reviews: reviews.length,
        supportTickets: supportTickets.length,
        messages: messages.length,
        savedPassengers: savedPassengers.length,
        packageBookings: packageBookings.length,
      },
      totalTrips: trips.length,
      totalBookings: bookings.length,
      totalPayments: payments.length,
      totalTickets: supportTickets.length,
    };
  }

  /** Traveler dashboard — personal metrics */
  getTravelerDashboard(travelerId: number) {
    const myTrips = trips.filter((t) => t.travelerId === travelerId);
    const myBookings = bookings.filter((b) => b.travelerId === travelerId);
    const myTripIds = myTrips.map((t) => t.tripId);
    const myExpensesTotal = expenses
      .filter((e) => myTripIds.includes(e.tripId))
      .reduce((sum, e) => sum + e.amount, 0);
    const myTickets = supportTickets.filter((t) => t.travelerId === travelerId);

    const today = new Date().toISOString().slice(0, 10);
    const upcomingTrips = myTrips.filter(
      (t) => t.startDate >= today && t.status !== 'Completed' && t.status !== 'Cancelled',
    );

    return {
      myTripsCount: myTrips.length,
      myBookingsCount: myBookings.length,
      myExpensesTotal,
      mySupportTicketsCount: myTickets.length,
      upcomingTrips,
    };
  }

  /** Guide dashboard — assignment metrics */
  getGuideDashboard(guideId: number) {
    const assignedTrips = trips.filter((t) => t.guideId === guideId);
    const completedTrips = assignedTrips.filter((t) => t.status === 'Completed');
    const pendingRequests = assignedTrips.filter(
      (t) => t.status === 'Pending' || t.status === 'Planning',
    );
    const guideMessages = messages.filter(
      (m) =>
        (m.sender === 'guide' && m.senderId === guideId) ||
        (m.receiver === 'guide' && m.receiverId === guideId),
    );

    return {
      assignedTripsCount: assignedTrips.length,
      completedTripsCount: completedTrips.length,
      pendingRequests: pendingRequests.length,
      messagesCount: guideMessages.length,
    };
  }

  /** Support dashboard — ticket & refund metrics */
  getSupportDashboard() {
    return {
      totalTickets: supportTickets.length,
      openTickets: supportTickets.filter((t) => t.status === 'Open').length,
      resolvedTickets: supportTickets.filter(
        (t) => t.status === 'Resolved' || t.status === 'Closed',
      ).length,
      refundRequests: refunds.length,
      pendingRefunds: refunds.filter((r) => r.refundStatus === 'Processing').length,
    };
  }
}
