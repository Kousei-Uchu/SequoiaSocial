import { NextResponse } from 'next/server';

export async function GET() {
  const redirectUrl = encodeURIComponent("https://social.sequoiasupport.com/api/matrix/login/callback");
  const homeserver = "https://matrix.social.sequoiasupport.com:8448";

  return NextResponse.redirect(`${homeserver}/_matrix/client/r0/login/sso/redirect/google?redirectUrl=${redirectUrl}`);
}
