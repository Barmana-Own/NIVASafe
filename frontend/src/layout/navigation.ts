import type { IconName } from "../components/UI";
import { readAssessmentMethodSelection } from "../features/assessments/assessmentMethods";

export type NavigationScope = "all" | "members" | "administrators" | "inspectors";
type NavigationBase = { id: string; labelKey: string; icon: IconName; scope?: NavigationScope };

export type NavigationLink = NavigationBase & {
  kind: "link";
  path: string;
  search?: Readonly<Record<string, string>>;
  routeMode?: "fmea-new" | "fmea-saved" | "rula-new" | "rula-saved";
  pendingStatusKey?: string;
};

export type NavigationPending = NavigationBase & { kind: "pending"; statusKey: string };
export type NavigationDisclosure = NavigationBase & { kind: "disclosure"; children: readonly NavigationItem[] };
export type NavigationGroup = NavigationBase & { kind: "group"; children: readonly NavigationItem[] };
export type NavigationItem = NavigationLink | NavigationPending | NavigationDisclosure;
export type NavigationNode = NavigationGroup | NavigationItem;
export type NavigationLocation = { pathname: string; search: string };
export type NavigationCrumb = Pick<NavigationBase, "id" | "labelKey">;

const pending = (id: string, labelKey: string, icon: IconName = "files", scope: NavigationScope = "all"): NavigationPending => ({
  kind: "pending", id, labelKey, icon, scope, statusKey: "navigation.backendPending",
});

export const navigationTree: readonly NavigationGroup[] = [
  {
    kind: "group", id: "management", labelKey: "group.management", icon: "dashboard", children: [
      { kind: "link", id: "dashboard", labelKey: "nav.dashboard", icon: "dashboard", path: "/", scope: "all" },
      { kind: "link", id: "projects", labelKey: "nav.projects", icon: "projects", path: "/projects", scope: "all" },
      { kind: "link", id: "assistant", labelKey: "nav.assistant", icon: "assistant", path: "/assistant", scope: "all" },
    ],
  },
  {
    kind: "group", id: "assessments", labelKey: "group.assessments", icon: "fmea", children: [
      {
        kind: "disclosure", id: "assessments-create", labelKey: "nav.newAssessment", icon: "plus", children: [
          { kind: "link", id: "fmea-new", labelKey: "nav.fmeaType", icon: "fmea", path: "/choose-path", search: { category: "safety", mode: "new" }, routeMode: "fmea-new", scope: "all" },
          { kind: "link", id: "rula-new", labelKey: "nav.rulaType", icon: "rula", path: "/choose-path", search: { category: "ergonomics", mode: "new" }, routeMode: "rula-new", scope: "all" },
          pending("chemical-risk-new", "nav.chemicalRisk", "warning"),
        ],
      },
      {
        kind: "disclosure", id: "assessments-saved", labelKey: "nav.savedAssessments", icon: "folder", children: [
          { kind: "link", id: "fmea-saved", labelKey: "nav.fmeaType", icon: "fmea", path: "/choose-path", search: { category: "safety", mode: "saved" }, routeMode: "fmea-saved", scope: "all" },
          { kind: "link", id: "rula-saved", labelKey: "nav.rulaType", icon: "rula", path: "/choose-path", search: { category: "ergonomics", mode: "saved" }, routeMode: "rula-saved", scope: "all" },
          pending("chemical-risk-saved", "nav.chemicalRisk", "warning"),
        ],
      },
    ],
  },
  {
    kind: "group", id: "actions", labelKey: "group.actions", icon: "actions", children: [
      { kind: "link", id: "corrective-actions", labelKey: "nav.actions", icon: "actions", path: "/actions", scope: "all" },
    ],
  },
  {
    kind: "group", id: "documents", labelKey: "group.documents", icon: "files", children: [
      { kind: "link", id: "knowledge", labelKey: "nav.knowledge", icon: "knowledge", path: "/knowledge", scope: "all" },
      { kind: "link", id: "files", labelKey: "nav.files", icon: "files", path: "/files", scope: "all" },
      { kind: "link", id: "checklists", labelKey: "nav.checklists", icon: "audit", path: "/checklists", scope: "inspectors" },
      pending("work-permits", "nav.workPermits", "shield"),
      pending("questionnaires", "nav.questionnaires", "audit"),
      pending("plans-maps", "nav.plansMaps", "folder"),
    ],
  },
  {
    kind: "group", id: "incidents", labelKey: "group.incidents", icon: "warning", children: [
      { kind: "link", id: "incident-management", labelKey: "nav.incidents", icon: "warning", path: "/incidents", scope: "all" },
    ],
  },
  {
    kind: "group", id: "exposure", labelKey: "group.exposure", icon: "chart", children: [
      {
        kind: "disclosure", id: "exposure-measurements", labelKey: "nav.exposureMeasurements", icon: "activity", children: [
          pending("exposure-records", "nav.exposureRecords", "chart"),
          pending("exposure-guidance", "nav.exposureGuidance", "assistant"),
        ],
      },
    ],
  },
  {
    kind: "group", id: "other", labelKey: "group.other", icon: "health", children: [
      pending("occupational-health", "nav.occupationalHealth", "health", "administrators"),
      pending("industrial-ventilation", "nav.industrialVentilation", "activity"),
    ],
  },
  {
    kind: "group", id: "help", labelKey: "group.help", icon: "assistant", children: [
      { kind: "link", id: "notifications", labelKey: "nav.notifications", icon: "notifications", path: "/notifications", scope: "all" },
      { kind: "link", id: "support", labelKey: "nav.support", icon: "assistant", path: "/support", scope: "all" },
    ],
  },
  {
    kind: "group", id: "organization", labelKey: "group.organization", icon: "members", children: [
      { kind: "link", id: "members", labelKey: "nav.members", icon: "members", path: "/members", scope: "members" },
      { kind: "link", id: "admin", labelKey: "nav.adminPanel", icon: "shield", path: "/admin", scope: "administrators" },
      { kind: "link", id: "organizations", labelKey: "nav.organizations", icon: "dashboard", path: "/organizations", scope: "administrators" },
      { kind: "link", id: "activity-log", labelKey: "nav.activityLog", icon: "audit", path: "/activity-log", scope: "all" },
    ],
  },
  {
    kind: "group", id: "settings", labelKey: "group.settings", icon: "profile", children: [
      { kind: "link", id: "profile", labelKey: "nav.profile", icon: "profile", path: "/profile", scope: "all" },
      { kind: "link", id: "system-health", labelKey: "nav.health", icon: "health", path: "/health", scope: "administrators" },
    ],
  },
];

function scopeAllows(scope: NavigationScope | undefined, role: string) {
  if (!scope || scope === "all") return true;
  if (scope === "members") return ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role);
  if (scope === "inspectors") return ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "ASSESSOR"].includes(role);
  return ["SUPER_ADMIN", "ORG_ADMIN"].includes(role);
}

function filterItems(items: readonly NavigationItem[], role: string): NavigationItem[] {
  const visible: NavigationItem[] = [];
  for (const item of items) {
    if (!scopeAllows(item.scope, role)) continue;
    if (item.kind !== "disclosure") {
      visible.push(item);
      continue;
    }
    const children = filterItems(item.children, role);
    if (children.length) visible.push({ ...item, children });
  }
  return visible;
}

export function getNavigationForRole(role: string, globalRole = role): NavigationGroup[] {
  return navigationTree.flatMap((group) => {
    const children = filterItems(group.children, role).map(item => item.id === "support" ? { ...item, labelKey: globalRole === "SUPER_ADMIN" ? "nav.supportInbox" : "nav.support" } : item);
    return children.length ? [{ ...group, children }] : [];
  });
}

function pathMatches(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function linkMatches(link: NavigationLink, location: NavigationLocation) {
  const query = new URLSearchParams(location.search);
  if (location.pathname === "/choose-path") {
    const selection = readAssessmentMethodSelection(location.search);
    return selection !== null && link.search?.category === selection.category && link.search?.mode === selection.mode;
  }
  if (link.routeMode === "fmea-new") return location.pathname === "/fmea" && query.get("view") !== "registered" && !query.has("edit");
  if (link.routeMode === "fmea-saved") return (location.pathname === "/fmea" && (query.get("view") === "registered" || query.has("edit"))) || location.pathname.startsWith("/fmea/");
  if (link.routeMode === "rula-new") return location.pathname === "/rula" && query.get("view") !== "results" && !query.has("edit");
  if (link.routeMode === "rula-saved") return (location.pathname === "/rula" && (query.get("view") === "results" || query.has("edit"))) || location.pathname.startsWith("/rula/");
  return pathMatches(location.pathname, link.path);
}

function findTrail(items: readonly NavigationNode[], location: NavigationLocation, ancestors: NavigationCrumb[] = []): NavigationCrumb[] | null {
  for (const item of items) {
    const current = [...ancestors, { id: item.id, labelKey: item.labelKey }];
    if (item.kind === "group" || item.kind === "disclosure") {
      const found = findTrail(item.children, location, current);
      if (found) return found;
    } else if (item.kind === "link" && linkMatches(item, location)) {
      return current;
    }
  }
  return null;
}

export function getActiveNavigationTrail(location: NavigationLocation, role = "SUPER_ADMIN", globalRole = role): NavigationCrumb[] {
  if (location.pathname === "/choose-path" && !readAssessmentMethodSelection(location.search)) {
    return [
      { id: "assessments", labelKey: "group.assessments" },
      { id: "assessments-create", labelKey: "nav.newAssessment" },
      { id: "legacy-assessment-chooser", labelKey: "path.choose" },
    ];
  }
  return findTrail(getNavigationForRole(role, globalRole), location) ?? [];
}

export function getNavigationHref(link: NavigationLink) {
  if (!link.search) return link.path;
  return `${link.path}?${new URLSearchParams(link.search).toString()}`;
}

export function isNavigationLinkActive(link: NavigationLink, location: NavigationLocation) {
  return linkMatches(link, location);
}
