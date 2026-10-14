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
  DeleteDialog,
  bookingStatuses,
  matches,
  money,
  ownerLabel,
  useAdminData,
} from '../../components/admin/AdminUI';
import BookingStatusModal from '../../components/admin/BookingStatusModal';

/**
 * AdminBookingsPage
 * Primary route: /admin/bookings
 *
 * State & Architectural Ownership:
 * 1. AdminBookingsPage (Page Coordinator):
 *    - Owns composite data loader (fetching bookings, trips, travelers, agencies, payments in parallel).
 *    - Displays operational booking status separately from actual recorded financial payment status.
 *    - Owns search filter queries and status filters.
 *    - Controls selection of the active booking record for inspection/status update.
 * 2. BookingStatusModal (Presentation & Form Component):
 *    - Displays financial breakdown (service, transport, insurance, cancellation protection).
 *    - Clearly distinguishes operational status from recorded payment status.
 *    - Renders stored fractional insurance rates accurately (0.07 represents 7%).
 *    - Displays errors directly inside the active modal dialog.
 */

// Composite loader fetching bookings and related entities including recorded payments
const loadBookingsData = async (options) => {
  const [bookings, trips, travelers, agencies, payments] = await Promise.all([
    bookingsApi.getAll(options),
    tripsApi.getAll(options),
    travelersApi.getAll(options),
    agenciesApi.getAll(options),
    paymentsApi.getAll(options),
  ]);

  return {
    bookings: Array.isArray(bookings) ? bookings : [],
    trips: Array.isArray(trips) ? trips : [],
    travelers: Array.isArray(travelers) ? travelers : travelers?.value || [],
    agencies: Array.isArray(agencies) ? agencies : agencies?.value || [],
    payments: Array.isArray(payments) ? payments : [],
  };
};

export default function AdminBookingsPage() {
  const resource = useAdminData(loadBookingsData);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected booking for detail modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Selected booking for delete dialog
  const [deletingBooking, setDeletingBooking] = useState(null);

  // ─── Entity Resolvers ──────────────────────────────────────────────────────
  const d = resource.data;

  const resolveOwnerName = (row) =>
    ownerLabel(row, d?.travelers || [], d?.agencies || []);

  const resolveDestination = (row) => {
    const trip = (d?.trips || []).find((t) => t.tripId === row.tripId);
    return trip?.destination || `Trip #${row.tripId}`;
  };

  const resolvePayment = (booking) => {
    if (!booking) return null;
    return (d?.payments || []).find((p) => p.bookingId === booking.bookingId) || null;
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

  // ─── Modal & Action Handlers ───────────────────────────────────────────────

  const handleSelectBooking = (booking) => {
    setSelectedBooking(booking);
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
  };

  const handleUpdateBookingStatus = (bookingId, nextStatus) => {
    resource.run(
      () => bookingsApi.update(bookingId, { status: nextStatus }),
      `Booking #${bookingId} status updated to '${nextStatus}'.`,
      () => {
        setSelectedBooking(null);
      }
    );
  };

  const handleOpenDelete = (booking) => {
    setDeletingBooking(booking);
  };

  const handleCloseDelete = () => {
    setDeletingBooking(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingBooking) return;
    resource.run(
      () => bookingsApi.delete(deletingBooking.bookingId),
      `Booking #${deletingBooking.bookingId} deleted.`,
      () => {
        setDeletingBooking(null);
      }
    );
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
    },
    {
      label: 'Type',
      key: 'type',
    },
    {
      label: 'Customer / Owner',
      render: resolveOwnerName,
    },
    {
      label: 'Associated Trip',
      render: resolveDestination,
    },
    {
      label: 'Amount',
      render: (b) => money(b.amount),
    },
    {
      label: 'Booking Status',
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
            title="Inspect financials and update operational status"
          >
            Inspect / Status
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => handleOpenDelete(b)}
            disabled={resource.busy}
            title="Delete booking record"
          >
            Delete
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

      {/* Controlled Booking Detail & Status Modal */}
      {selectedBooking && (
        <BookingStatusModal
          isOpen={Boolean(selectedBooking)}
          booking={selectedBooking}
          payment={resolvePayment(selectedBooking)}
          destinationName={resolveDestination(selectedBooking)}
          ownerName={resolveOwnerName(selectedBooking)}
          isBusy={resource.busy}
          error={resource.error}
          onClose={handleCloseModal}
          onSubmit={handleUpdateBookingStatus}
        />
      )}

      {/* Delete Dialog */}
      {deletingBooking && (
        <DeleteDialog
          title={`Delete Booking #${deletingBooking.bookingId}: ${deletingBooking.service}?`}
          warning="This action will delete this booking record. If financial transactions reference this booking, deletion will be blocked by backend integrity rules."
          busy={resource.busy}
          error={resource.error}
          onClose={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </AdminPage>
  );
}
