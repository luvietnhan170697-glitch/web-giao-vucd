export const ROLE_ADMIN = "admin";
export const ROLE_STAFF = "staff";
export const ROLE_VIEWER = "viewer";

export const PAGE_PERMISSIONS: Record<string, string[]> = {
  "/": [ROLE_ADMIN, ROLE_STAFF, ROLE_VIEWER],
  "/students": [ROLE_ADMIN, ROLE_STAFF, ROLE_VIEWER],

  "/import-xml": [ROLE_ADMIN, ROLE_STAFF],
  "/import-graduation": [ROLE_ADMIN, ROLE_STAFF],
  "/import-practical": [ROLE_ADMIN, ROLE_STAFF],
  "/import-update": [ROLE_ADMIN, ROLE_STAFF],
  "/export-ma-dk": [ROLE_ADMIN, ROLE_STAFF],

  "/users": [ROLE_ADMIN],
};

export const API_PERMISSIONS: Record<string, string[]> = {
  "/api/auth/me": [ROLE_ADMIN, ROLE_STAFF, ROLE_VIEWER],
  "/api/auth/logout": [ROLE_ADMIN, ROLE_STAFF, ROLE_VIEWER],

  "/api/import-xml": [ROLE_ADMIN, ROLE_STAFF],
  "/api/import-graduation": [ROLE_ADMIN, ROLE_STAFF],
  "/api/import-practical": [ROLE_ADMIN, ROLE_STAFF],
  "/api/import-update": [ROLE_ADMIN, ROLE_STAFF],
  "/api/export-ma-dk": [ROLE_ADMIN, ROLE_STAFF],
  "/api/students": [ROLE_ADMIN, ROLE_STAFF, ROLE_VIEWER],
  "/api/users": [ROLE_ADMIN],
  "/api/courses": ["admin"],
};

function matchPermission(
  pathname: string,
  rules: Record<string, string[]>
): string[] | null {
  const exact = rules[pathname];
  if (exact) return exact;

  const matchedPrefix = Object.keys(rules)
    .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matchedPrefix ? rules[matchedPrefix] : null;
}

export function hasPageAccess(role: string, pathname: string) {
  const allowedRoles = matchPermission(pathname, PAGE_PERMISSIONS);
  if (!allowedRoles) return role === ROLE_ADMIN;
  return allowedRoles.includes(role);
}

export function hasApiAccess(role: string, pathname: string) {
  const allowedRoles = matchPermission(pathname, API_PERMISSIONS);
  if (!allowedRoles) return role === ROLE_ADMIN;
  return allowedRoles.includes(role);
}