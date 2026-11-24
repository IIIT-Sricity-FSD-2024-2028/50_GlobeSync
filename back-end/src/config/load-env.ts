import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads back-end/.env into process.env (values already set in the shell win).
 *
 * Local demo convenience: when there is no .env file and NODE_ENV is not
 * 'production', the committed .env.example (development-only values) is used,
 * so `npm run start:dev` works straight after unzipping. Production must always
 * provide its own environment.
 */
function parse(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const root = path.resolve(__dirname, '..', '..');
const envFile = path.join(root, '.env');
const exampleFile = path.join(root, '.env.example');
const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

let source: string | null = null;
if (fs.existsSync(envFile)) source = envFile;
else if (!isProduction && fs.existsSync(exampleFile)) source = exampleFile;

if (source) {
  for (const [k, v] of Object.entries(parse(source))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  if (source === exampleFile) {
    // eslint-disable-next-line no-console
    console.warn('[GlobeSync] No back-end/.env found: using .env.example (development values only).');
  }
}
