import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Automatically load environment files if variable not already present in environment
const envFiles = ['.env.local', '.env.development', '.env'];
for (const envFile of envFiles) {
  const filePath = path.join(rootDir, envFile);
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

let backendUrl = process.env.BACKEND_API_URL;
if (!backendUrl && process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/')) {
  backendUrl = process.env.NEXT_PUBLIC_API_URL;
}
if (!backendUrl) {
  backendUrl = 'http://localhost:3000';
}
backendUrl = backendUrl.replace(/\/+$/, '');

const triggerUrl = `${backendUrl}/pubspec/sandbox-build/trigger`;
console.log(`[INFO] Triggering Super App Sandbox build via Backend API (${triggerUrl})...`);

try {
  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    console.log('[SUCCESS] Sandbox build triggered successfully:', data);
  } else {
    console.error(`[ERROR] Backend returned HTTP ${response.status}:`, data);
    process.exit(1);
  }
} catch (err) {
  console.error(`[ERROR] Failed to reach Backend API at ${backendUrl}: ${err.message}`);
  process.exit(1);
}
