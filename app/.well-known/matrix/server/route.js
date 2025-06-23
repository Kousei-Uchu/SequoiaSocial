export async function GET() {
  return new Response(
    JSON.stringify({
      "m.server": "matrix.social.sequoiasupport.com:443"
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
}
