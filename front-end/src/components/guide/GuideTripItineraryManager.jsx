import React from 'react';

/**
 * GuideTripItineraryManager
 * Displays daily activities and progress for the selected assigned trip.
 * Features:
 * - Activity progress bar & status counters
 * - Grouped schedule by dayNumber
 * - Quick status progression (Pending -> Confirmed -> Completed)
 * - Controlled activity creation & editing handlers
 * - Preserves deletion restrictions (no delete button for guides, with explicit guidance)
 * - Clean empty states
 */
export default function GuideTripItineraryManager({
  trip,
  itineraries = [],
  isLoadingItineraries = false,
  isUpdatingActivity = false,
  onOpenAddActivity,
  onOpenEditActivity,
  onUpdateActivityStatus,
  onOpenSuggestModal,
}) {
  if (isLoadingItineraries) {
    return (
      <div className="guide-itin-state-box">
        <div className="guide-spinner" />
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
          Loading daily itinerary schedule...
        </p>
      </div>
    );
  }

  const total = itineraries.length;
  const completed = itineraries.filter((i) => i.activityStatus === 'Completed').length;
  const confirmed = itineraries.filter((i) => i.activityStatus === 'Confirmed').length;
  const pending = itineraries.filter((i) => i.activityStatus === 'Pending').length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group by dayNumber
  const days = [...new Set(itineraries.map((i) => Number(i.dayNumber) || 1))].sort((a, b) => a - b);

  return (
    <div className="guide-itin-manager">
      {/* Top Actions Bar */}
      <div className="guide-itin-topbar">
        <div>
          <h4 className="guide-itin-heading">
            Daily Itinerary & Tour Activities
          </h4>
          <span className="guide-itin-subheading">
            Manage daily schedule, update completion progress, or propose itinerary modifications.
          </span>
        </div>

        <div className="guide-itin-actions-row">
          <button
            type="button"
            className="btn btn-secondary guide-btn-suggest-itinerary"
            onClick={onOpenSuggestModal}
            title="Send an itinerary change suggestion directly to client message desk"
          >
            ✈️ Suggest Itinerary
          </button>
          <button
            type="button"
            className="btn btn-primary guide-btn-add-activity"
            onClick={onOpenAddActivity}
            title="Add a new activity to this trip's confirmed itinerary"
          >
            ➕ Add Activity
          </button>
        </div>
      </div>

      {/* Progress & Metric Summary Cards */}
      <div className="guide-itin-progress-section">
        <div className="guide-itin-progress-head">
          <span>Overall Tour Completion</span>
          <span className="guide-itin-progress-stat">
            {completed} of {total} activities completed ({progressPct}%)
          </span>
        </div>
        <div className="guide-itin-progress-track">
          <div
            className="guide-itin-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="guide-itin-metrics-grid">
          <div className="guide-metric-box">
            <div className="guide-metric-val pending-color">{pending}</div>
            <div className="guide-metric-label">Pending</div>
          </div>
          <div className="guide-metric-box">
            <div className="guide-metric-val confirmed-color">{confirmed}</div>
            <div className="guide-metric-label">Confirmed</div>
          </div>
          <div className="guide-metric-box">
            <div className="guide-metric-val completed-color">{completed}</div>
            <div className="guide-metric-label">Completed</div>
          </div>
          <div className="guide-metric-box">
            <div className="guide-metric-val total-color">{total}</div>
            <div className="guide-metric-label">Total Activities</div>
          </div>
        </div>
      </div>

      {/* Activities Schedule or Empty State */}
      {total === 0 ? (
        <div className="guide-itin-empty-box">
          <span style={{ fontSize: '36px' }}>📋</span>
          <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 700 }}>
            No Itinerary Activities Scheduled
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            There are no activity entries logged for Trip #{trip?.tripId} ({trip?.destination}) yet. Click "Add Activity" above to create Day 1 activities.
          </p>
        </div>
      ) : (
        <div className="guide-itin-days-list">
          {days.map((day) => {
            const dayItems = itineraries.filter(
              (i) => (Number(i.dayNumber) || 1) === day
            );
            const dayDone = dayItems.filter((i) => i.activityStatus === 'Completed').length;

            return (
              <div key={day} className="guide-itin-day-group">
                <div className="guide-itin-day-header">
                  <span className="guide-itin-day-title">Day {day}</span>
                  <span className="guide-itin-day-count">
                    {dayDone}/{dayItems.length} activities completed
                  </span>
                </div>

                <div className="guide-itin-items-container">
                  {dayItems.map((item) => {
                    const status = item.activityStatus || 'Pending';
                    const isDone = status === 'Completed';

                    // Next status in cycle: Pending -> Confirmed -> Completed -> Pending
                    const nextStatus =
                      status === 'Pending'
                        ? 'Confirmed'
                        : status === 'Confirmed'
                        ? 'Completed'
                        : 'Pending';

                    return (
                      <div
                        key={item.itineraryId}
                        className={`guide-itin-item-card ${isDone ? 'done' : ''}`}
                      >
                        <div className="guide-itin-item-status-icon">
                          {isDone ? '✅' : status === 'Confirmed' ? '⏳' : '📋'}
                        </div>

                        <div className="guide-itin-item-details">
                          <div className="guide-itin-item-title-row">
                            <span className="guide-itin-item-title">
                              {item.activity}
                            </span>
                            <span className={`guide-status-pill status-${status.toLowerCase()}`}>
                              {status}
                            </span>
                          </div>

                          <div className="guide-itin-item-meta">
                            <span>🕒 {item.time || 'Flexible'}</span>
                            {item.city && <span>📍 {item.city}</span>}
                          </div>
                        </div>

                        <div className="guide-itin-item-actions">
                          <button
                            type="button"
                            onClick={() => onUpdateActivityStatus(item.itineraryId, nextStatus)}
                            disabled={isUpdatingActivity}
                            className="btn btn-secondary guide-btn-status-toggle"
                            title={`Click to mark activity as ${nextStatus}`}
                          >
                            Mark {nextStatus}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEditActivity(item)}
                            className="btn btn-secondary guide-btn-edit-act"
                            title="Edit activity details"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explicit Backend Deletion Restriction Documentation Notice */}
      <div className="guide-itin-deletion-notice">
        🔒 <strong>Policy Note:</strong> Itinerary entry deletion is restricted to Platform Administrators to ensure audit preservation. Guides can freely edit, reschedule, or mark activities as Completed.
      </div>
    </div>
  );
}
