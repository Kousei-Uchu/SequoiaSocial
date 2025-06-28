import { NextResponse } from 'next/server';

export async function GET() {
  const redirectUrl = encodeURIComponent("https://social.sequoiasupport.com/api/matrix/login/callback");
  const homeserver = "https://matrix.social.sequoiasupport.com";

  return NextResponse.redirect(`${homeserver}/_matrix/client/r0/login/sso/redirect/oidc-google?redirectUrl=${redirectUrl}`);
}
