export const ROLE_ADMIN = "admin";
export const ROLE_STAFF = "staff";
export const ROLE_VIEWER = "viewer";

export function hasPageAccess(role: string, pathname: string) {
  if (role === ROLE_ADMIN) return true;

  const viewerAllowed = ["/", "/dashboard", "/students"];
  const staffBlocked = ["/users"];

  if (role === ROLE_VIEWER) {
    return viewerAllowed.includes(pathname);
  }

  if (role === ROLE_STAFF) {
    return !staffBlocked.includes(pathname);
  }

  return false;
}

export function hasApiAccess(role: string, pathname: string) {
  if (role === ROLE_ADMIN) return true;

  if (role === ROLE_VIEWER) {
    return pathname === "/api/auth/me";
  }

  if (role === ROLE_STAFF) {
    return !pathname.startsWith("/api/users");
  }

  return false;
}