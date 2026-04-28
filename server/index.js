import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean) : true,
  credentials: false,
}));
app.use(express.json({ limit: '512kb' }));

const sessions = new Map();

const defaultContent = {
  events: [
    {
      id: 'kss-153',
      name: 'KSS #153 — Knowledge Sharing Session',
      shortName: 'KSS #153',
      date: 'March 14, 2025',
      description: 'NexaSphere\'s inaugural Knowledge Sharing Session focused on the impact of AI.',
      status: 'completed',
      icon: '🧠',
      tags: ['AI', 'Learning', 'Community'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function normalizePrivateKey(k) {
  return k.includes('\\n') ? k.replace(/\\n/g, '\n') : k;
}

async function ensureContentFile() {
  const dir = path.dirname(CONTENT_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(CONTENT_FILE);
  } catch {
    await fs.writeFile(CONTENT_FILE, JSON.stringify(defaultContent, null, 2), 'utf8');
  }
}

async function readContent() {
  await ensureContentFile();
  const raw = await fs.readFile(CONTENT_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeContent(content) {
  await ensureContentFile();
  await fs.writeFile(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
}

function parseBearer(authHeader = '') {
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

function adminAuth(req, res, next) {
  const bearer = parseBearer(req.headers.authorization || '');
  if (!bearer || !sessions.has(bearer)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.adminSession = sessions.get(bearer);
  return next();
}

function toSafeString(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function sanitizeEvent(input = {}) {
  const status = input.status === 'upcoming' ? 'upcoming' : 'completed';
  const tags = Array.isArray(input.tags)
    ? input.tags.map(t => toSafeString(t, 40)).filter(Boolean).slice(0, 12)
    : String(input.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 12);

  return {
    id: toSafeString(input.id || input.shortName || input.name, 80)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `event-${Date.now()}`,
    name: toSafeString(input.name, 120),
    shortName: toSafeString(input.shortName || input.name, 60),
    date: toSafeString(input.date, 80),
    description: toSafeString(input.description, 1200),
    status,
    icon: toSafeString(input.icon || '📌', 8),
    tags,
  };
}

async function appendFormToSheet(formType, payload) {
  const clientEmail = requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = normalizePrivateKey(requiredEnv('GOOGLE_PRIVATE_KEY'));
  const spreadsheetId = requiredEnv('GOOGLE_SHEET_ID');

  const defaultTab = process.env.GOOGLE_SHEET_TAB_NAME || 'Responses';
  const tabMap = {
    membership: process.env.GOOGLE_MEMBERSHIP_TAB_NAME || 'MembershipResponses',
    recruitment: process.env.GOOGLE_RECRUITMENT_TAB_NAME || 'RecruitmentResponses',
    core_team: process.env.GOOGLE_CORE_TEAM_TAB_NAME || 'CoreTeamResponses',
  };
  const sheetName = tabMap[formType] || defaultTab;

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const now = new Date().toISOString();
  const row = [
    now,
    formType,
    toSafeString(payload.fullName, 140),
    toSafeString(payload.collegeEmail, 140),
    toSafeString(payload.whatsapp, 40),
    JSON.stringify(payload),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

function isPhoneish(s) {
  const v = String(s || '').trim();
  return /^[+()\-\s0-9]{8,20}$/.test(v);
}

app.get('/healthz', async (req, res) => {
  const content = await readContent();
  res.json({ ok: true, events: content.events.length });
});

app.get('/api/content/events', async (req, res) => {
  try {
    const content = await readContent();
    return res.json({ events: content.events || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to load events' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const u = String(req.body?.username || '').trim();
  const p = String(req.body?.password || '');

  if (u !== username || p !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { username: u, createdAt: Date.now() });
  return res.json({ token, username: u });
});

app.get('/api/admin/events', adminAuth, async (req, res) => {
  const content = await readContent();
  return res.json({ events: content.events || [] });
});

app.post('/api/admin/events', adminAuth, async (req, res) => {
  try {
    const event = sanitizeEvent(req.body || {});
    if (!event.name || !event.date || !event.description) {
      return res.status(400).json({ error: 'name, date and description are required' });
    }

    const content = await readContent();
    if (content.events.some(e => e.id === event.id)) {
      event.id = `${event.id}-${Date.now()}`;
    }
    const now = new Date().toISOString();
    content.events.unshift({ ...event, createdAt: now, updatedAt: now });
    await writeContent(content);
    return res.status(201).json({ ok: true, event: content.events[0] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unable to create event' });
  }
});

app.put('/api/admin/events/:id', adminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const patch = sanitizeEvent({ ...req.body, id });
    const content = await readContent();
    const idx = content.events.findIndex(e => e.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Event not found' });

    content.events[idx] = {
      ...content.events[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    await writeContent(content);
    return res.json({ ok: true, event: content.events[idx] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unable to update event' });
  }
});

app.delete('/api/admin/events/:id', adminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const content = await readContent();
    const before = content.events.length;
    content.events = content.events.filter(e => e.id !== id);
    if (content.events.length === before) {
      return res.status(404).json({ error: 'Event not found' });
    }
    await writeContent(content);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unable to delete event' });
  }
});

async function handleForm(formType, req, res) {
  try {
    const body = req.body || {};
    if (!toSafeString(body.fullName, 120)) return res.status(400).json({ error: 'fullName is required' });
    if (!isEmail(body.collegeEmail)) return res.status(400).json({ error: 'Invalid email address' });
    if (!isPhoneish(body.whatsapp)) return res.status(400).json({ error: 'Invalid contact number' });

    await appendFormToSheet(formType, body);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Submission failed' });
  }
}

app.post('/api/forms/membership', (req, res) => handleForm('membership', req, res));
app.post('/api/forms/recruitment', (req, res) => handleForm('recruitment', req, res));
app.post('/api/core-team/apply', (req, res) => handleForm('core_team', req, res));

const port = Number(process.env.PORT || 8787);
ensureContentFile().then(() => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`NexaSphere server listening on http://localhost:${port}`);
  });
});
