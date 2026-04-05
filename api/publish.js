/**
 * POST /api/publish
 * Recibe el HTML completo de la invitación y lo sube a GitHub.
 * El token nunca sale del servidor — se lee desde variables de entorno de Vercel.
 *
 * Variables de entorno requeridas en Vercel:
 *   GITHUB_TOKEN  — Personal Access Token con permisos Contents: Read & Write
 *   GH_OWNER      — usuario de GitHub (ej: SantiagoJimenezOrtega)  [opcional si está hardcodeado]
 *   GH_REPO       — nombre del repo (ej: Invitacion)               [opcional si está hardcodeado]
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',      // suficiente para HTML con imágenes base64
    },
  },
};

export default async function handler(req, res) {
  /* Solo POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* Variables de entorno */
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GH_OWNER     = process.env.GH_OWNER || 'SantiagoJimenezOrtega';
  const GH_REPO      = process.env.GH_REPO  || 'Invitacion';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'GITHUB_TOKEN no configurado — agrégalo en Vercel → Settings → Environment Variables'
    });
  }

  /* Leer el body (Vercel lo parsea como string para Content-Type: text/plain) */
  const html = typeof req.body === 'string' ? req.body : '';

  if (html.length < 200) {
    return res.status(400).json({ error: 'Contenido vacío o demasiado corto' });
  }

  const apiBase = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/index.html`;
  const ghHeaders = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    /* 1 — Obtener SHA actual del archivo */
    const fileRes = await fetch(apiBase, { headers: ghHeaders });
    if (!fileRes.ok) {
      const body = await fileRes.json().catch(() => ({}));
      throw new Error(`GitHub ${fileRes.status}: ${body.message || 'Error de autenticación'}`);
    }
    const { sha } = await fileRes.json();

    /* 2 — Subir nueva versión */
    const b64 = Buffer.from(html, 'utf-8').toString('base64');
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify({
        message: 'Actualizar invitación desde el editor',
        content: b64,
        sha,
        branch: 'main',
      }),
    });

    if (!putRes.ok) {
      const body = await putRes.json().catch(() => ({}));
      throw new Error(body.message || `GitHub error ${putRes.status}`);
    }

    return res.status(200).json({ ok: true });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
