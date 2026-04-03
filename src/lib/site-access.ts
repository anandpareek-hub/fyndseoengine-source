import { prisma } from "@/lib/prisma";

export type SiteRole = "owner" | "editor" | "viewer";

interface SiteAccessResult {
  hasAccess: boolean;
  role: SiteRole;
  site: any;
}

/**
 * Check if a user has access to a site (either as owner or shared member).
 * Returns the site and the user's role.
 */
export async function checkSiteAccess(
  siteId: string,
  userId: string,
  requiredRole?: SiteRole
): Promise<SiteAccessResult> {
  // Check if user is the owner
  const ownedSite = await prisma.site.findFirst({
    where: { id: siteId, userId },
  });

  if (ownedSite) {
    return { hasAccess: true, role: "owner", site: ownedSite };
  }

  // Check if user has shared access
  const access = await prisma.siteAccess.findFirst({
    where: { siteId, userId },
    include: { site: true },
  });

  if (!access) {
    return { hasAccess: false, role: "viewer", site: null };
  }

  const role = access.role as SiteRole;

  // Check if the role meets the requirement
  if (requiredRole) {
    const roleHierarchy: Record<SiteRole, number> = { owner: 3, editor: 2, viewer: 1 };
    if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
      return { hasAccess: false, role, site: access.site };
    }
  }

  return { hasAccess: true, role, site: access.site };
}

/**
 * Quick check: does user have at least viewer access to this site?
 */
export async function canAccessSite(siteId: string, userId: string): Promise<boolean> {
  const { hasAccess } = await checkSiteAccess(siteId, userId);
  return hasAccess;
}

/**
 * Quick check: does user have at least editor access to this site?
 */
export async function canEditSite(siteId: string, userId: string): Promise<boolean> {
  const { hasAccess } = await checkSiteAccess(siteId, userId, "editor");
  return hasAccess;
}
