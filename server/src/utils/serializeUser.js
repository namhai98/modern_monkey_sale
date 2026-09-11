// Shape a users row for API responses. Never leaks password_hash — only
// whether one is set, which the profile screen needs to pick between
// "set a password" and "change password".
export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    ...(row.created_at ? { created_at: row.created_at } : {}),
    ...(row.has_password !== undefined ? { has_password: row.has_password } : {}),
    ...(row.providers !== undefined ? { providers: row.providers || [] } : {}),
  };
}
