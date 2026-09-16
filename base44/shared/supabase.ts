// Shared Supabase access layer for StudyMate backend functions.
// Connects via the Base44 Supabase connector (Management API), then exposes
// small PostgREST helpers. Per-student isolation is enforced by callers:
// every helper call MUST include a user_id filter.

export async function getSupabaseContext(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("supabase");
  const mgmtHeaders = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const projectsRes = await fetch("https://api.supabase.com/v1/projects", { headers: mgmtHeaders });
  if (!projectsRes.ok) throw new Error(`Could not list Supabase projects (${projectsRes.status})`);
  const projects = await projectsRes.json();
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error("No Supabase projects found in the connected account");
  }
  const ref = projects[0].ref;

  const keysRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, { headers: mgmtHeaders });
  if (!keysRes.ok) throw new Error(`Could not read Supabase API keys (${keysRes.status})`);
  const keys = await keysRes.json();
  const serviceKey = Array.isArray(keys) ? keys.find(k => k.name === "service_role") : null;
  if (!serviceKey || !serviceKey.api_key) throw new Error("Supabase service_role key not found");

  return {
    ref,
    restUrl: `https://${ref}.supabase.co/rest/v1`,
    restHeaders: {
      "apikey": serviceKey.api_key,
      "Authorization": `Bearer ${serviceKey.api_key}`,
      "Content-Type": "application/json"
    },
    mgmtHeaders
  };
}

function buildQuery(filters) {
  const parts = [];
  for (const key of Object.keys(filters)) {
    const value = filters[key];
    if (value === null || value === undefined) continue;
    parts.push(`${key}=eq.${encodeURIComponent(String(value))}`);
  }
  return parts.join("&");
}

export async function sbSelect(ctx, table, filters, opts = {}) {
  const query = buildQuery(filters);
  const order = opts.order || "created_at.desc";
  const limit = Math.min(opts.limit || 500, 1000);
  const url = `${ctx.restUrl}/${table}?select=*&${query}&order=${order}&limit=${limit}`;
  const res = await fetch(url, { headers: ctx.restHeaders });
  if (!res.ok) throw new Error(`Supabase read failed on ${table} (${res.status})`);
  return await res.json();
}

export async function sbInsert(ctx, table, rowOrRows) {
  const isArray = Array.isArray(rowOrRows);
  const payload = isArray ? rowOrRows : [rowOrRows];
  const res = await fetch(`${ctx.restUrl}/${table}`, {
    method: "POST",
    headers: { ...ctx.restHeaders, "Prefer": "return=representation" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Supabase insert failed on ${table} (${res.status}): ${await res.text()}`);
  const out = await res.json();
  return isArray ? out : (out[0] || null);
}

export async function sbUpsert(ctx, table, rows, onConflict) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const res = await fetch(`${ctx.restUrl}/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { ...ctx.restHeaders, "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Supabase upsert failed on ${table} (${res.status}): ${await res.text()}`);
  const out = await res.json();
  return Array.isArray(rows) ? out : (out[0] || null);
}

export async function sbUpdate(ctx, table, filters, data) {
  const query = buildQuery(filters);
  if (!query) throw new Error("Supabase update requires a filter");
  const res = await fetch(`${ctx.restUrl}/${table}?${query}`, {
    method: "PATCH",
    headers: { ...ctx.restHeaders, "Prefer": "return=representation" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase update failed on ${table} (${res.status}): ${await res.text()}`);
  const out = await res.json();
  return out;
}

export async function sbDelete(ctx, table, filters) {
  const query = buildQuery(filters);
  if (!query) throw new Error("Supabase delete requires a filter");
  const res = await fetch(`${ctx.restUrl}/${table}?${query}`, {
    method: "DELETE",
    headers: ctx.restHeaders
  });
  if (!res.ok) throw new Error(`Supabase delete failed on ${table} (${res.status}): ${await res.text()}`);
  return true;
}

export async function sbRunSql(ctx, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ctx.ref}/database/query`, {
    method: "POST",
    headers: ctx.mgmtHeaders,
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) throw new Error(`Supabase SQL failed (${res.status}): ${await res.text()}`);
  try {
    return await res.json();
  } catch (_) {
    return null;
  }
}