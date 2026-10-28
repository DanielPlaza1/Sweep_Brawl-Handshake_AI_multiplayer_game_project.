import { mkdir, access, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Optional, temporary preview tunnel. Never needed by the production server.
const root = new URL('../', import.meta.url);
const executable = new URL('../.tools/cloudflared.exe', import.meta.url);
if (process.platform !== 'win32' || process.arch !== 'x64') {
  console.error('Install cloudflared for your operating system, then run: cloudflared tunnel --url http://localhost:3000');
  process.exit(1);
}
try { await access(executable); }
catch {
  console.log('Downloading the official Cloudflare tunnel helper into .tools/…');
  await mkdir(new URL('.tools/', root), { recursive: true });
  const response = await fetch('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  await writeFile(executable, Buffer.from(await response.arrayBuffer()));
}
const port = Number(process.env.PORT) || 3000;
console.log('Temporary public preview: keep this window and the game server running. The URL changes each time.');
const child = spawn(fileURLToPath(executable), ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'], { stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
