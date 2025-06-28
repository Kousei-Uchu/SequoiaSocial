// pages/api/olm-wasm.js
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const wasmPath = path.join(process.cwd(), 'node_modules', '@matrix-org', 'olm', 'olm.wasm');
    const wasmFile = await fs.readFile(wasmPath);
    
    res.setHeader('Content-Type', 'application/wasm');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(wasmFile);
  } catch (err) {
    console.error('Failed to serve WASM file:', err);
    res.status(404).end();
  }
}