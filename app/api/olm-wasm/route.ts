// app/api/olm-wasm/route.ts
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static'; // Ensure this route is statically generated
export const revalidate = 31536000; // Revalidate once a year

export async function GET() {
  try {
    const wasmPath = path.join(process.cwd(), 'node_modules', '@matrix-org', 'olm', 'olm.wasm');
    const wasmFile = await fs.readFile(wasmPath);
    
    return new NextResponse(wasmFile, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Failed to serve WASM file:', err);
    return new NextResponse(null, { status: 404 });
  }
}