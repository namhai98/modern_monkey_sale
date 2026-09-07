// Shape a users row for API responses. Never leaks password_hash.
export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    ...(row.created_at ? { created_at: row.created_at } : {}),
  };
}
