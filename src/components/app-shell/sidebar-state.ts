/**
 * The sidebar's collapsed state lives in a cookie so the server can render the
 * right width on first paint (no flash) and the choice survives reloads.
 */
export const SIDEBAR_COOKIE = "pt-sidebar";

export function readSidebarCollapsed(cookieValue: string | undefined): boolean {
  return cookieValue === "collapsed";
}

export function writeSidebarCollapsed(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
}
