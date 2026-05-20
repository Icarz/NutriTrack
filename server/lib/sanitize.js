// Trim string fields in body and enforce per-field max lengths.
// Returns { error } if any field exceeds its cap, else { ok: true }.
// Mutates body: trims strings; empty trimmed strings become null only when noted by caller.
function sanitizeBody(body, limits) {
  if (!body || typeof body !== 'object') return { ok: true };
  for (const [field, max] of Object.entries(limits)) {
    const v = body[field];
    if (v == null) continue;
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    body[field] = trimmed;
    if (trimmed.length > max) {
      return { error: `${field}: must be ${max} characters or fewer` };
    }
  }
  return { ok: true };
}

module.exports = { sanitizeBody };
