/**
 * POST /api/publish
 * Crea o actualiza [slug]/index.html en GitHub con el HTML limpio de la invitación.
 * El token vive en Vercel (nunca en el cliente).
 *
 * Body esperado: JSON { slug: "sofia-y-mateo", html: "<!DOCTYPE html>..." }
 *
 * Variables de entorno en Vercel:
 *   GITHUB_TOKEN  — Personal Access Token (Contents: Read & Write)
 *   GH_OWNER      — usuario de GitHub  (default: SantiagoJimenezOrtega)
 *   GH_REPO       — nombre del repo    (default: Invitacion)
 */

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GH_OWNER     = process.env.GH_OWNER || 'SantiagoJimenezOrtega';
  const GH_REPO      = process.env.GH_REPO  || 'Invitacion';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'GITHUB_TOKEN no configurado — agrégalo en Vercel → Settings → Environment Variables',
    });
  }

  const { slug, html, audio } = req.body || {};

  /* Validar slug: solo letras minúsculas, números y guiones */
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,60}[a-z0-9]$/.test(slug)) {
    return res.status(400).json({
      error: 'URL inválida — usa solo letras, números y guiones (ej: sofia-y-mateo)',
    });
  }

  /* ── Modo audio: subir archivo de música por separado ──── */
  if (audio && !html) {
    if (!audio.base64 || !audio.ext) {
      return res.status(400).json({ error: 'Falta base64 o ext en audio' });
    }
    const audioPath = `${slug}/music.${audio.ext}`;
    const audioApi  = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${audioPath}`;
    const ghHeaders = {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    try {
      let sha;
      const check = await fetch(audioApi, { headers: ghHeaders });
      if (check.ok) sha = (await check.json()).sha;
      const putRes = await fetch(audioApi, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          message: `Audio: ${slug}`,
          content: audio.base64,
          branch: 'main',
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const e = await putRes.json().catch(() => ({}));
        throw new Error(e.message || `GitHub error ${putRes.status}`);
      }
      return res.status(200).json({ ok: true, path: `/${slug}/music.${audio.ext}` });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!html || html.length < 200) {
    return res.status(400).json({ error: 'Contenido HTML vacío o inválido' });
  }

  const filePath = `${slug}/index.html`;
  const apiBase  = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    /* Obtener SHA si el archivo ya existe (necesario para actualizarlo) */
    let sha;
    const checkRes = await fetch(apiBase, { headers: ghHeaders });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    } else if (checkRes.status !== 404) {
      throw new Error(`GitHub ${checkRes.status}: error verificando archivo existente`);
    }

    /* Crear o actualizar el archivo */
    const b64  = Buffer.from(html, 'utf-8').toString('base64');
    const body = {
      message: sha
        ? `Actualizar invitación: ${slug}`
        : `Crear invitación: ${slug}`,
      content: b64,
      branch: 'main',
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `GitHub error ${putRes.status}`);
    }

    return res.status(200).json({ ok: true, path: `/${slug}` });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
