import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  const wasmPath = join(process.cwd(), 'node_modules/@matrix-org/olm/olm.wasm');
  try {
    const buffer = await readFile(wasmPath);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/wasm'
      }
    });
  } catch (error) {
    return new Response('Not found', { status: 404 });
  }
}