import React, { useState, useMemo } from 'react';
import {
  bookingsApi,
  tripsApi,
  travelersApi,
  agenciesApi,
  paymentsApi,
} from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  bookingStatuses,
  matches,
  money,
  ownerLabel,
  useAdminData,
} from '../../components/admin/AdminUI';
import BookingInspectionModal from '../../components/admin/BookingInspectionModal';

/**
 * AdminBookingsPage
 * Primary route: /admin/bookings
 *
 * Operational Governance:
 * 1. Read-Only Inspection:
 *    - Admin monitors booking records, inspection details, traveler/guide information,
 *      associated trips, authorized payment info, and refund statuses.
 * 2. Prohibited Direct Mutations:
 *    - Admin cannot directly modify booking details, amounts, change booking/payment status,
 *      or delete booking records.
 * 3. Composite Loader Resilience:
 *    - Uses Promise.allSettled so secondary failures (e.g. auxiliary lookups) do not crash the page.
 */

const loadBookingsData = async (options) => {
  const [bookingsRes, tripsRes, travelersRes, agenciesRes, paymentsRes] = await Promise.allSettled([
    bookingsApi.getAll(options),
    tripsApi.getAll(options),
    travelersApi.getAll(options),
    agenciesApi.getAll(options),
    paymentsApi.getAll(options),
  ]);

  const bookings = bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value) ? bookingsRes.value : [];
  const trips = tripsRes.status === 'fulfilled' && Array.isArray(tripsRes.value) ? tripsRes.value : [];
  const travelers =
    travelersRes.status === 'fulfilled'
      ? Array.isArray(travelersRes.value)
        ? travelersRes.value
        : travelersRes.value?.value || []
      : [];
  const agencies =
    agenciesRes.status === 'fulfilled'
      ? Array.isArray(agenciesRes.value)
        ? agenciesRes.value
        : agenciesRes.value?.value || []
      : [];
  const payments = paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value) ? paymentsRes.value : [];

  return { bookings, trips, travelers, agencies, payments };
};

export default function AdminBookingsPage() {
  const resource = useAdminData(loadBookingsData);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected booking for detail modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  // ─── Entity Resolvers ──────────────────────────────────────────────────────
  const d = resource.data;

  const resolveOwnerName = (row) =>
    ownerLabel(row, d?.travelers || [], d?.agencies || []);

  const resolveDestination = (row) => {
    const trip = (d?.trips || []).find((t) => t.tripId === row.tripId);
    return trip?.destination || `Trip #${row.tripId}`;
  };

  const resolvePaymentsForBooking = (booking) => {
    if (!booking) return [];
    return (d?.payments || []).filter((p) => Number(p.bookingId) === Number(booking.bookingId));
  };

  const resolvePayment = (booking) => {
    const list = resolvePaymentsForBooking(booking);
    if (list.length === 0) return null;
    // Prefer authoritative Paid payment over pending/failed attempts
    return list.find((p) => String(p.status).toLowerCase() === 'paid') || list[list.length - 1];
  };

  const resolveBookingAmount = (b) => {
    if (!b) return null;
    if (b.total_minor != null) return Number(b.total_minor) / 100;
    if (b.totalPriceMinor != null) return Number(b.totalPriceMinor) / 100;
    if (b.amount != null) return Number(b.amount);
    if (b.totalAmount != null) return Number(b.totalAmount);
    return null;
  };

  const resolveAgency = (booking) => {
    if (!booking?.agencyId) return null;
    return (d?.agencies || []).find((a) => Number(a.agencyId) === Number(booking.agencyId)) || null;
  };

  const resolveTrip = (booking) => {
    if (!booking?.tripId) return null;
    return (d?.trips || []).find((t) => Number(t.tripId) === Number(booking.tripId)) || null;
  };

  // ─── Memoized Filtered Bookings ────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    const rawBookings = d?.bookings || [];
    return rawBookings.filter((booking) => {
      // 1. Status Filter
      if (statusFilter && booking.status !== statusFilter) {
        return false;
      }

      // 2. Search Query Match
      if (searchQuery.trim()) {
        const dest = resolveDestination(booking);
        const owner = resolveOwnerName(booking);
        const payment = resolvePayment(booking);
        return matches(
          [
            booking.bookingId,
            booking.service,
            booking.type,
            booking.status,
            dest,
            owner,
            payment?.status || 'Unrecorded',
          ],
          searchQuery
        );
      }

      return true;
    });
  }, [d?.bookings, statusFilter, searchQuery, d?.trips, d?.travelers, d?.agencies, d?.payments]);

  // ─── Modal Handlers ────────────────────────────────────────────────────────
  const handleSelectBooking = (booking) => {
    setSelectedBooking(booking);
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
  };

  // ─── Table Columns Definition ──────────────────────────────────────────────
  const columns = [
    {
      label: 'ID',
      render: (b) => `#${b.bookingId}`,
    },
    {
      label: 'Service',
      key: 'service',
      render: (b) => b.service || b.itemType || b.type || 'Travel Item',
    },
    {
      label: 'Customer / Owner',
      render: resolveOwnerName,
    },
    {
      label: 'Destination',
      render: resolveDestination,
    },
    {
      label: 'Amount',
      render: (b) => {
        const amt = resolveBookingAmount(b);
        return amt === null ? 'Unavailable' : money(amt);
      },
    },
    {
      label: 'Reservation Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      label: 'Payment Status',
      render: (b) => {
        const payment = resolvePayment(b);
        if (!payment) {
          return (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 500,
                backgroundColor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
              }}
            >
              Unrecorded
            </span>
          );
        }
        return <StatusBadge status={payment.status} />;
      },
    },
    {
      label: 'Actions',
      render: (b) => (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSelectBooking(b)}
            disabled={resource.busy}
            title="Inspect booking financials, payment records, and refund status"
          >
            Inspect
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage title="Bookings" resource={resource}>
      {resource.data && (
        <>
          {/* Filters Bar: Search & Status Dropdown */}
          <Filters
            query={searchQuery}
            setQuery={setSearchQuery}
            status={statusFilter}
            setStatus={setStatusFilter}
            statuses={bookingStatuses}
          />

          {/* Paginated Bookings Table */}
          <AdminTable
            rowKey="bookingId"
            rows={filteredBookings}
            columns={columns}
          />
        </>
      )}

      {/* Controlled Read-Only Booking Inspection Modal */}
      <BookingInspectionModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        payment={resolvePayment(selectedBooking)}
        payments={resolvePaymentsForBooking(selectedBooking)}
        trip={resolveTrip(selectedBooking)}
        agency={resolveAgency(selectedBooking)}
        destinationName={selectedBooking ? resolveDestination(selectedBooking) : 'Unknown Trip'}
        ownerName={selectedBooking ? resolveOwnerName(selectedBooking) : 'Unassigned'}
        onClose={handleCloseModal}
      />
    </AdminPage>
  );
}
