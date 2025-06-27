'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const captchaRef = useRef(null);

  const [homeserver] = useState('https://matrix.social.sequoiasupport.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== passwordConfirm) {
      setErrorMsg("Passwords don't match.");
      return;
    }

    const captchaValue = window.grecaptcha.getResponse();
    if (!captchaValue) {
      setErrorMsg("Please complete the CAPTCHA.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${homeserver}/_matrix/client/r0/register?kind=user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          auth: {
            type: "m.login.recaptcha",
            response: captchaValue,
          }
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Registration failed');
      }

      router.push('/login');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      window.grecaptcha.reset();
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

        {/* CAPTCHA widget */}
        <div className="g-recaptcha" data-sitekey="6LcbKm8rAAAAAFl3MtAQ5ueXAlBxvWzSgaVUrO6Y"></div>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>

      {errorMsg && <p style={{ color: 'red', marginTop: '1rem' }}>{errorMsg}</p>}
    </main>
  );
}
