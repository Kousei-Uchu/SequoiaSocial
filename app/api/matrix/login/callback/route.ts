import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loginToken = searchParams.get('loginToken');

  if (!loginToken) {
    return new NextResponse("Missing loginToken", { status: 400 });
  }

  const homeserver = "https://matrix.social.sequoiasupport.com";

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

  // Save the Matrix access token and user ID to secure HTTP-only cookies
  const cookieStore = cookies();
  cookieStore.set({
    name: 'matrix_token',
    value: data.access_token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  cookieStore.set({
    name: 'matrix_user_id',
    value: data.user_id,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  cookieStore.set({
    name: 'matrix_device_id',
    value: data.device_id,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  // Redirect to your chat UI page
  return NextResponse.redirect('https://social.sequoiasupport.com/chat');
}
