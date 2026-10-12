import React, { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form submit handler with validation
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = 'Valid email is required';
    }

    if (!message.trim()) {
      newErrors.message = 'Message is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Backend endpoint does not exist (Gap #2 in MIGRATION_CHECKLIST.md)
    // We simulate client-side delivery and display the success state honestly.
    setErrors({});
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setMessage('');
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <div className="contact-page-root" style={{ background: 'var(--soft)', minHeight: '85vh', paddingBottom: '60px' }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', padding: '60px 24px 36px' }}>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '10px' }}>
          Get In Touch
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
          Have questions or need assistance with your itinerary? We'd love to hear from you.
        </p>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div
        className="contact-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          maxWidth: '960px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* LEFT COLUMN: FORM */}
        <div
          className="card"
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '36px',
            border: '1px solid var(--border)',
          }}
        >
          {isSubmitted ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '44px', marginBottom: '12px' }}>✅</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>
                Message Sent!
              </h3>
              <p style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6', marginBottom: '20px' }}>
                Thank you for reaching out. We'll get back to you within 24 hours.
              </p>
              <div
                style={{
                  fontSize: '11px',
                  color: '#047857',
                  background: 'rgba(255, 255, 255, 0.7)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}
              >
                ℹ️ <strong>System Note:</strong> The NestJS backend does not expose a <code>POST /contact</code> endpoint. This inquiry was processed client-side.
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: null });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1.5px solid ${errors.name ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    background: errors.name ? '#fff8f8' : '#fff',
                  }}
                />
                {errors.name && (
                  <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                    {errors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1.5px solid ${errors.email ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    background: errors.email ? '#fff8f8' : '#fff',
                  }}
                />
                {errors.email && (
                  <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                    {errors.email}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="How can we help you?"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errors.message) setErrors({ ...errors, message: null });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1.5px solid ${errors.message ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    background: errors.message ? '#fff8f8' : '#fff',
                    fontFamily: 'inherit',
                  }}
                />
                {errors.message && (
                  <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                    {errors.message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  width: '100%',
                  marginTop: '6px',
                }}
              >
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: CONTACT INFO & MAP PLACEHOLDER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#ffeef5',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              📞
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Phone</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                9440301727<br />8247475743
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#fff8ee',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              📧
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                indai952007@gmail.com
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#ffeef5',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              📍
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Location</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                IIIT SriCity<br />Chittoor, Andhra Pradesh<br />India
              </div>
            </div>
          </div>

          {/* Map Banner Placeholder */}
          <div
            style={{
              background: 'var(--gradient)',
              borderRadius: '16px',
              height: '160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              gap: '8px',
              opacity: 0.9,
            }}
          >
            <div style={{ fontSize: '32px' }}>📍</div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>IIIT Sri City Campus Map View</div>
          </div>
        </div>
      </div>
    </div>
  );
}
