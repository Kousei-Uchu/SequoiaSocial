'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as sdk from 'matrix-js-sdk';

export default function LoginPage() {
  const router = useRouter();

  const [homeserver, setHomeserver] = useState('https://matrix.social.sequoiasupport.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loginToken = params.get("loginToken");

    if (loginToken) {
      const client = sdk.createClient(homeserver);
      client.login("m.login.token", { token: loginToken })
        .then(({ access_token, user_id }) => {
          localStorage.setItem("mx_access_token", access_token);
          localStorage.setItem("mx_user_id", user_id);
          localStorage.setItem("mx_homeserver", homeserver);
          router.replace("/chat");
        })
        .catch(err => {
          console.error("Token login failed:", err);
          setErrorMsg("Google login failed.");
        });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const client = sdk.createClient({ baseUrl: homeserver });

    try {
      const { user_id, access_token } = await client.loginWithPassword(username, password);
      localStorage.setItem("mx_access_token", access_token);
      localStorage.setItem("mx_user_id", user_id);
      localStorage.setItem("mx_homeserver", homeserver);
      router.push('/chat');
    } catch (err) {
      console.error('Login failed:', err);
      setErrorMsg('Invalid username or password.');
    }
  };

  const redirectToGoogle = () => {
    const redirectUrl = encodeURIComponent("https://social.sequoiasupport.com/auth/login"); 
    window.location.href = `${homeserver}/_matrix/client/r0/login/sso/redirect/google?redirectUrl=${redirectUrl}`;
  };

  return (
    <main style={{ maxWidth: '400px', margin: 'auto', padding: '2rem' }}>
      <h2>Login to Sequoia Social</h2>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="@username:yourdomain"
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
        <button type="submit" style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>
          Login
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