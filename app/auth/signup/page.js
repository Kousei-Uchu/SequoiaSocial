'use client';

import { useState } from 'react';

export default function SignupPage() {
  const [homeserver] = useState('https://matrix.social.sequoiasupport.com:8448');
  const [loading, setLoading] = useState(false);

  const redirectToGoogle = () => {
    setLoading(true);
    // Redirect URL after login (adjust if needed)
    window.location.href = "/api/matrix/login"
  };

  return (
    <main style={{ maxWidth: 400, margin: 'auto', padding: '2rem', textAlign: 'center' }}>
      <h2>Sign Up / Log In with Google</h2>

      <button
        onClick={redirectToGoogle}
        disabled={loading}
        style={{
          width: '100%',
          backgroundColor: '#fff',
          color: '#000',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #ddd',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginTop: '1.5rem',
        }}
      >
        {loading ? 'Redirecting...' : (
          <>
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              style={{ width: '1.25rem', height: '1.25rem' }}
            />
            Continue with Google
          </>
        )}
      </button>
    </main>
  );
}
