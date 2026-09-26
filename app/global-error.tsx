'use client';

/*
 * Last-resort boundary: the root layout itself failed, so none of the app's
 * CSS or fonts can be assumed. Plain inline styles, same palette.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: '#FFF6F8',
          color: '#4A1942',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 28, margin: 0 }}>NhakoSearch hit a snag</h1>
        <p style={{ maxWidth: 320, fontWeight: 700, color: '#774C6D', margin: 0 }}>
          Your progress is saved. Reload to pick up where you left off.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 48,
            padding: '0 24px',
            border: '2px solid #4A1942',
            borderRadius: 16,
            background: '#FF6FA5',
            color: '#2A0F26',
            fontWeight: 800,
            fontSize: 18,
            boxShadow: '4px 5px 0 0 #4A1942',
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
