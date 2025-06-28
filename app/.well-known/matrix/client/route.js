export async function GET() {
  return new Response(
    JSON.stringify({
      "m.homeserver": {
        "base_url": "https://matrix.social.sequoiasupport.com"
      }
    }
  ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
}
