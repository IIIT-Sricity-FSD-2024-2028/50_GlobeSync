import React from 'react';

/**
 * PassengerList: Displays the traveler's master list of saved co-traveler passengers.
 * Renders cards with gender avatars, age badges, database IDs, and Edit/Delete controls.
 */
export default function PassengerList({
  passengers = [],
  onEdit,
  onDelete,
  onAddNew,
}) {
  const getAvatar = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return '👨';
      case 'female':
        return '👩';
      default:
        return '👤';
    }
  };

  return (
    <div
      className="card"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-light, #eee)',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            👥 Saved Passengers (Master List)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
            {passengers.length} saved {passengers.length === 1 ? 'co-traveler' : 'co-travelers'} stored in backend database.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNew}
          className="btn btn-primary"
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
        >
          ➕ Add Passenger
        </button>
      </div>

      {/* Empty State */}
      {passengers.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed var(--border)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            No saved passengers found
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '380px', margin: '4px auto 16px' }}>
            Save family members and travel companions to pre-fill passenger forms when planning trips.
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
          >
            Add First Passenger
          </button>
        </div>
      ) : (
        /* Passenger Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {passengers.map((p) => (
            <div
              key={p.passId}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#fff',
                    border: '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                  }}
                >
                  {getAvatar(p.gender)}
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {p.age} yrs &bull; {p.gender}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                    PASS #{p.passId}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '6px' }}
                  title="Edit passenger details"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#fff',
                    border: '1px solid #fee2e2',
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                  title="Remove passenger"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
