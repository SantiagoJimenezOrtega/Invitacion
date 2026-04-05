/**
 * GET  /api/save-state  — devuelve el estado guardado (editor-state.json del repo)
 * POST /api/save-state  — guarda { siteContent, colors } en editor-state.json del repo
 *
 * Variables de entorno (mismas que publish.js):
 *   GITHUB_TOKEN, GH_OWNER, GH_REPO
 */

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GH_OWNER     = process.env.GH_OWNER || 'SantiagoJimenezOrtega';
  const GH_REPO      = process.env.GH_REPO  || 'Invitacion';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN no configurado' });
  }

  const filePath = 'editor-state.json';
  const apiBase  = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  /* ── GET: leer estado guardado ──────────────────────────── */
  if (req.method === 'GET') {
    try {
      const r = await fetch(apiBase, { headers: ghHeaders });
      if (r.status === 404) return res.status(404).json({ error: 'Sin estado guardado' });
      if (!r.ok) return res.status(r.status).json({ error: `GitHub ${r.status}` });

      const meta = await r.json();

      /* Archivos > 1 MB: GitHub devuelve content:null y download_url */
      let raw;
      if (meta.content) {
        raw = Buffer.from(meta.content, 'base64').toString('utf-8');
      } else if (meta.download_url) {
        const dl = await fetch(meta.download_url);
        if (!dl.ok) throw new Error(`download_url fetch failed: ${dl.status}`);
        raw = await dl.text();
      } else {
        throw new Error('GitHub no devolvió contenido del archivo');
      }

      return res.status(200).json(JSON.parse(raw));
    } catch (e) {
      console.error('save-state GET error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  /* ── POST: guardar estado ───────────────────────────────── */
  if (req.method === 'POST') {
    const { siteContent, colors } = req.body || {};
    if (!siteContent) {
      console.error('save-state POST: falta siteContent en body. body keys:', Object.keys(req.body || {}));
      return res.status(400).json({ error: 'Falta siteContent' });
    }

    try {
      /* Obtener SHA si el archivo ya existe */
      let sha;
      const check = await fetch(apiBase, { headers: ghHeaders });
      if (check.ok) sha = (await check.json()).sha;
      else if (check.status !== 404) throw new Error(`GitHub ${check.status}`);

      const payload = JSON.stringify({ siteContent, colors: colors || {} }, null, 2);
      const body = {
        message: 'Guardar estado del editor',
        content: Buffer.from(payload, 'utf-8').toString('base64'),
        branch: 'main',
        ...(sha ? { sha } : {}),
      };

      const put = await fetch(apiBase, { method: 'PUT', headers: ghHeaders, body: JSON.stringify(body) });
      if (!put.ok) {
        const err = await put.json().catch(() => ({}));
        throw new Error(err.message || `GitHub error ${put.status}`);
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('save-state POST error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
