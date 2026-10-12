import React from 'react';

/**
 * HotelSelectStep: Accommodation selection with city-adapted simulated tiers
 */
export default function HotelSelectStep({
  destination = 'Destination',
  selectedHotel = '',
  onHotelSelect,
}) {
  const cityName = destination ? destination.split(',')[0].trim() : 'Destination';

  const hotelTiers = [
    {
      name: `Grand ${cityName} Hotel & Suites`,
      tier: 'Luxury 5-Star',
      rating: '⭐⭐⭐⭐⭐ 4.9',
      price: 18000,
      amenities: '🏊 Infinity Pool • 🍳 Gourmet Breakfast • 📶 High-Speed WiFi • 🧖 Wellness Spa',
      area: 'City Center',
    },
    {
      name: `Hotel Lumiere ${cityName}`,
      tier: 'Premium 4-Star',
      rating: '⭐⭐⭐⭐ 4.5',
      price: 8500,
      amenities: '🏊 Rooftop Pool • 🍳 Buffet Breakfast • 📶 WiFi • 🅿 Reserved Parking',
      area: 'Historic Arts District',
    },
    {
      name: `Budget Inn ${cityName}`,
      tier: 'Comfort 3-Star',
      rating: '⭐⭐⭐ 4.1',
      price: 3500,
      amenities: '📶 Fast WiFi • 🍳 Continental Breakfast • ❄ Air Conditioning',
      area: 'Midtown Transit Hub',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Choose Accommodation in {cityName}</h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              background: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '12px',
              fontWeight: 700,
            }}
          >
            Simulated Hotel Rates
          </span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Select your accommodation tier or opt out if arranging private stays.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hotelTiers.map((hotel) => {
          const isChosen = selectedHotel === hotel.name;
          return (
            <div
              key={hotel.name}
              onClick={() => onHotelSelect(hotel.name, hotel.price)}
              style={{
                padding: '18px',
                borderRadius: '12px',
                border: `1.5px solid ${isChosen ? 'var(--primary)' : 'var(--border)'}`,
                background: isChosen ? '#fff1f6' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700 }}>🏨 {hotel.name}</h4>
                    {isChosen && (
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 800 }}>
                        ✓ SELECTED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {hotel.tier} • {hotel.rating} • 📍 {hotel.area}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{hotel.price.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>per room / night</div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--border-light, #eee)',
                }}
              >
                {hotel.amenities}
              </div>
            </div>
          );
        })}

        {/* Skip Hotel Option */}
        <div
          onClick={() => onHotelSelect('', 0)}
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            border: `1.5px dashed ${!selectedHotel ? 'var(--primary)' : 'var(--border)'}`,
            background: !selectedHotel ? '#fff1f6' : '#fafafa',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>
              🏡 No Hotel Required (Arranging Own Stay)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Skip hotel booking for this itinerary. Hotel cost will be ₹0.
            </div>
          </div>
          {!selectedHotel && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
              ✓ Selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
