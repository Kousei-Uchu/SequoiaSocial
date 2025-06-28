import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('matrix_token')?.value;
  const userId = cookieStore.get('matrix_user_id')?.value;

  if (!accessToken || !userId) {
    return NextResponse.json({ error: 'Missing token or user ID' }, { status: 401 });
  }

  return NextResponse.json({ access_token: accessToken, user_id: userId });
}
