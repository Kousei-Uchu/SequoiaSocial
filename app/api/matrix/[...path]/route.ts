// app/api/matrix/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return handleMatrixRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMatrixRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleMatrixRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMatrixRequest(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    }
  });
}

async function handleMatrixRequest(request: NextRequest) {
  const path = request.nextUrl.pathname.split('/api/matrix/')[1];
  const matrixUrl = new URL(`https://matrix.social.sequoiasupport.com/_matrix/client/v3/${path}`);
  
  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    matrixUrl.searchParams.append(key, value);
  });

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  // Forward authorization if present
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  try {
    const response = await fetch(matrixUrl.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text()
    });

    // Handle response
    const contentType = response.headers.get('content-type');
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*'
    });

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return new NextResponse(JSON.stringify(data), {
        status: response.status,
        headers: responseHeaders
      });
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: responseHeaders
      });
    }
  } catch (error) {
    console.error('Matrix proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to communicate with Matrix server',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}