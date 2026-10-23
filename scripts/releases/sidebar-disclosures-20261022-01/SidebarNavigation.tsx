import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/UI";
import { getNavigationHref, isNavigationLinkActive, type NavigationDisclosure, type NavigationGroup, type NavigationItem, type NavigationLocation } from "./navigation";

type SidebarNavigationProps = {
  groups: readonly NavigationGroup[];
  location: NavigationLocation;
  collapsed: boolean;
  activeIds: ReadonlySet<string>;
  onNavigate: () => void;
  t: (key: string) => string;
};

function SidebarDisclosure({ item, label, location, collapsed, active, children }: { item: NavigationDisclosure; label: string; location: NavigationLocation; collapsed: boolean; active: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active, location.pathname, location.search]);
  const expanded = collapsed || open;
  const headingId = `nav-heading-${item.id}`, toggleId = `nav-toggle-${item.id}`, panelId = `nav-panel-${item.id}`;
  return <div className={`nav-disclosure${active ? " has-active-descendant" : ""}`} data-navigation-id={item.id} role="group" aria-labelledby={headingId}>
    <h3 id={headingId} className="nav-disclosure-title"><button id={toggleId} className="nav-disclosure-toggle" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(value => !value)}><Icon name={item.icon} size={17}/><span>{label}</span><Icon name="chevron" size={15} className="nav-disclosure-chevron"/></button></h3>
    <div id={panelId} className="nav-disclosure-items" hidden={!expanded}>{children}</div>
  </div>;
}

export function SidebarNavigation({ groups, location, collapsed, activeIds, onNavigate, t }: SidebarNavigationProps) {
  function renderItem(item: NavigationItem): ReactNode {
    if (item.kind === "pending") {
      const label = `${t(item.labelKey)} · ${t(item.statusKey)}`;
      return <div className="side-nav-pending" data-navigation-id={item.id} key={item.id} aria-label={label} title={collapsed ? label : undefined}>
        <Icon name={item.icon} size={18}/><span>{t(item.labelKey)}</span><small>{t(item.statusKey)}</small>
      </div>;
    }
    if (item.kind === "disclosure") {
      return <SidebarDisclosure key={item.id} item={item} label={t(item.labelKey)} location={location} collapsed={collapsed} active={activeIds.has(item.id)}>{item.children.map(renderItem)}</SidebarDisclosure>;
    }
    const active = isNavigationLinkActive(item, location);
    const label = t(item.labelKey);
    const pendingLabel = item.pendingStatusKey ? ` · ${t(item.pendingStatusKey)}` : "";
    return <Link key={item.id} data-navigation-id={item.id} to={getNavigationHref(item)} className={`side-nav-link${active ? " active" : ""}${item.pendingStatusKey ? " pending-route" : ""}`} aria-current={active ? "page" : undefined} aria-label={collapsed ? `${label}${pendingLabel}` : undefined} title={collapsed ? `${label}${pendingLabel}` : undefined} onClick={onNavigate}>
      <Icon name={item.icon} size={19}/><span>{label}</span>{item.pendingStatusKey && <small>{t(item.pendingStatusKey)}</small>}
    </Link>;
  }

  return groups.map((group) => {
    const headingId = `nav-heading-${group.id}`;
    return <section className={`nav-group${activeIds.has(group.id) ? " has-active-descendant" : ""}`} data-navigation-id={group.id} key={group.id} aria-labelledby={headingId}>
      <h2 id={headingId} className="nav-group-title">{t(group.labelKey)}</h2>
      <div className="nav-group-items">{group.children.map(renderItem)}</div>
    </section>;
  });
}
