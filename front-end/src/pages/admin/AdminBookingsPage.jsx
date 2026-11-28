import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminBookings } from '../../store/admin-bookings/admin-bookings-actions';
import { adminBookingsActions } from '../../store/admin-bookings/admin-bookings-slice';
import StatusBadge from '../../components/common/StatusBadge';
import {
  AdminPage,
  AdminTable,
  Filters,
  bookingStatuses,
  money,
  ownerLabel,
} from '../../components/admin/AdminUI';
import BookingInspectionModal from '../../components/admin/BookingInspectionModal';

export default function AdminBookingsPage() {
  const dispatch = useDispatch();

  const bookings = useSelector((state) => state.adminBookings.bookings);
  const relatedTrips = useSelector((state) => state.adminBookings.relatedTrips);
  const relatedTravelers = useSelector((state) => state.adminBookings.relatedTravelers);
  const relatedAgencies = useSelector((state) => state.adminBookings.relatedAgencies);
  const relatedPayments = useSelector((state) => state.adminBookings.relatedPayments);
  const selectedBookingId = useSelector((state) => state.adminBookings.selectedBookingId);
  const search = useSelector((state) => state.adminBookings.search);
  const statusFilter = useSelector((state) => state.adminBookings.statusFilter);
  const loading = useSelector((state) => state.adminBookings.loading);
  const error = useSelector((state) => state.adminBookings.error);

  useEffect(() => {
    dispatch(fetchAdminBookings());
  }, [dispatch]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((b) => b.bookingId === selectedBookingId) || null;
  }, [bookings, selectedBookingId]);

  // Entity Resolvers
  const resolveOwnerName = (row) =>
    ownerLabel(row, relatedTravelers || [], relatedAgencies || []);

  const resolveDestination = (row) => {
    const trip = (relatedTrips || []).find((t) => t.tripId === row.tripId);
    return trip?.destination || `Trip #${row.tripId}`;
  };

  const resolvePaymentsForBooking = (booking) => {
    if (!booking) return [];
    return (relatedPayments || []).filter((p) => Number(p.bookingId) === Number(booking.bookingId));
  };

  const resolvePayment = (booking) => {
    const list = resolvePaymentsForBooking(booking);
    if (list.length === 0) return null;
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
    return (relatedAgencies || []).find((a) => Number(a.agencyId) === Number(booking.agencyId)) || null;
  };

  const resolveTrip = (booking) => {
    if (!booking?.tripId) return null;
    return (relatedTrips || []).find((t) => Number(t.tripId) === Number(booking.tripId)) || null;
  };

  const filteredBookings = useMemo(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    return list.filter((booking) => {
      if (statusFilter && booking.status !== statusFilter) return false;
      if (search.trim()) {
        const dest = resolveDestination(booking);
        const owner = resolveOwnerName(booking);
        const q = search.toLowerCase();
        return (
          String(booking.bookingId ?? '').toLowerCase().includes(q) ||
          (booking.service ?? '').toLowerCase().includes(q) ||
          dest.toLowerCase().includes(q) ||
          owner.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, search, statusFilter, relatedTrips, relatedTravelers, relatedAgencies]);

  const resource = {
    loading,
    busy: loading,
    load: () => dispatch(fetchAdminBookings({ force: true })),
    error,
    data: bookings,
  };

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
            onClick={() => dispatch(adminBookingsActions.setSelectedBookingId(b.bookingId))}
            disabled={loading}
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
      {bookings && (
        <>
          <Filters
            query={search}
            setQuery={(val) => dispatch(adminBookingsActions.setSearch(val))}
            status={statusFilter}
            setStatus={(val) => dispatch(adminBookingsActions.setStatusFilter(val))}
            statuses={bookingStatuses}
          />
          <AdminTable
            rowKey="bookingId"
            rows={filteredBookings}
            columns={columns}
          />
        </>
      )}

      <BookingInspectionModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        payment={resolvePayment(selectedBooking)}
        payments={resolvePaymentsForBooking(selectedBooking)}
        trip={resolveTrip(selectedBooking)}
        agency={resolveAgency(selectedBooking)}
        destinationName={selectedBooking ? resolveDestination(selectedBooking) : 'Unknown Trip'}
        ownerName={selectedBooking ? resolveOwnerName(selectedBooking) : 'Unassigned'}
        onClose={() => dispatch(adminBookingsActions.clearSelectedBooking())}
      />
    </AdminPage>
  );
}
