'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  const [homeserver, setHomeserver] = useState('https://matrix.social.sequoiasupport.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectToGoogle = () => {
    const redirectUrl = encodeURIComponent("https://yourfrontend.com/login"); // replace with your frontend URL
    window.location.href = `${homeserver}/_matrix/client/r0/login/sso/redirect/google?redirectUrl=${redirectUrl}`;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== passwordConfirm) {
      setErrorMsg("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      // Call Synapse registration endpoint
      const res = await fetch(`${homeserver}/_matrix/client/r0/register?kind=user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
          auth: { type: 'm.login.dummy' } // minimal dummy auth for registration
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Registration failed');
      }

      // On success redirect to login page
      router.push('/login');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '400px', margin: 'auto', padding: '2rem' }}>
      <h2>Sign Up for Sequoia Social</h2>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Username (no @)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>

      <div style={{ textAlign: 'center', margin: '1.5rem 0', color: '#888' }}>or</div>

      <button
        onClick={redirectToGoogle}
        style={{
          width: '100%',
          backgroundColor: '#fff',
          color: '#000',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #ddd',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          style={{ width: '1.25rem', height: '1.25rem' }}
        />
        Continue with Google
      </button>

      {errorMsg && (
        <p style={{ color: 'red', marginTop: '1rem' }}>{errorMsg}</p>
      )}
    </main>
  );
}