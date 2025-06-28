import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loginToken = searchParams.get('loginToken');

  if (!loginToken) {
    return new NextResponse("Missing loginToken", { status: 400 });
  }

  const homeserver = "https://matrix.social.sequoiasupport.com:8448";

  const res = await fetch(`${homeserver}/_matrix/client/r0/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: "m.login.token",
      token: loginToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return new NextResponse(err.error || "Login failed", { status: 401 });
  }

  const data = await res.json();

  // 🔐 TODO: Save token to secure cookie, session store, etc.
  // For now, just redirect with token in URL (not safe for production)
  return NextResponse.redirect(`/auth/success?access_token=${data.access_token}`);
}
