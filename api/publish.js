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

  const { slug, html, asset } = req.body || {};

  /* Validar slug: solo letras minúsculas, números y guiones */
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,60}[a-z0-9]$/.test(slug)) {
    return res.status(400).json({
      error: 'URL inválida — usa solo letras, números y guiones (ej: sofia-y-mateo)',
    });
  }

  /* ── Helpers GitHub ─────────────────────────────────────── */
  const ghHeaders = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  async function ghPut(path, base64content, message) {
    const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
    let sha;
    const check = await fetch(api, { headers: ghHeaders });
    if (check.ok) sha = (await check.json()).sha;
    const r = await fetch(api, {
      method: 'PUT', headers: ghHeaders,
      body: JSON.stringify({ message, content: base64content, branch: 'main', ...(sha ? { sha } : {}) }),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `GitHub ${r.status}`); }
    return r;
  }

  async function ghGetBinary(path) {
    const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
    const r = await fetch(api, { headers: ghHeaders });
    if (!r.ok) throw new Error(`Chunk no encontrado: ${path} (${r.status})`);
    const meta = await r.json();
    if (meta.content) return Buffer.from(meta.content.replace(/\n/g, ''), 'base64');
    if (meta.download_url) return Buffer.from(await (await fetch(meta.download_url)).arrayBuffer());
    throw new Error(`Sin contenido en ${path}`);
  }

  /* ── Modo asset: subir imagen / audio por separado (evita 413) ── */
  if (asset && !html) {
    if (!asset.name) return res.status(400).json({ error: 'Falta name en asset' });

    /* Modo ensamblar: combina fragmentos en el archivo final */
    if (asset.finalize) {
      try {
        const { name, chunkCount } = asset;
        const safeFinal = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const buffers = [];
        for (let i = 0; i < chunkCount; i++) {
          buffers.push(await ghGetBinary(`${slug}/_chunk_${safeFinal}_${i}`));
        }
        const combined = Buffer.concat(buffers).toString('base64');
        await ghPut(`${slug}/${safeFinal}`, combined, `Audio: ${slug}/${safeFinal}`);
        return res.status(200).json({ ok: true });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    /* Modo normal: subir fragmento o archivo pequeño */
    if (!asset.base64) return res.status(400).json({ error: 'Falta base64 en asset' });
    const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    try {
      await ghPut(`${slug}/${safeName}`, asset.base64, `Asset: ${slug}/${safeName}`);
      return res.status(200).json({ ok: true, path: `/${slug}/${safeName}` });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!html || html.length < 200) {
    return res.status(400).json({ error: 'Contenido HTML vacío o inválido' });
  }

  const filePath = `${slug}/index.html`;
  const apiBase  = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`;

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
