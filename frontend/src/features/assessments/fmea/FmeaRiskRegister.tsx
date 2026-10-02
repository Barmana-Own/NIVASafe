import { DEFAULT_THRESHOLDS, type RiskThresholds } from "@nivasafe/domain";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState, Icon, SectionCard, StatusBadge, StyledSelect, TableContainer } from "../../../components/UI";
import { useI18n } from "../../../i18n";
import { type FmeaItemDraft, type FmeaRowMoveDirection, type RiskSortField, FMEA_RISK_PAGE_SIZE, FMEA_STAGE_TWO_RISK_PAGE_SIZE, OverlayDialogFrame, fmeaRiskValues } from "../assessmentShared";
import { FmeaFinalTableExportBar, FmeaReportTableContext, FmeaScoreGuide, type FmeaReportItem } from "./FmeaReportComponents";
import { FmeaItemEditor } from "./FmeaRiskEditor";

export function FmeaStageTwoDetailsCard({ items, processName, riskThresholds, loading, error, onRetry, canEdit = false, canDelete = false, canMove = false, onEditItem, onDelete, onMove }: { items: FmeaReportItem[]; processName: string; riskThresholds: RiskThresholds; loading: boolean; error: string; onRetry: () => void; canEdit?: boolean; canDelete?: boolean | ((item: FmeaReportItem) => boolean); canMove?: boolean | ((item: FmeaReportItem, index: number, visibleItems: FmeaReportItem[]) => boolean); onEditItem?: (item: FmeaReportItem, draft: FmeaItemDraft) => Promise<void>; onDelete?: (item: FmeaReportItem) => void; onMove?: (item: FmeaReportItem, direction: FmeaRowMoveDirection) => void }) {
  const { locale, t } = useI18n();
  const [viewingItem, setViewingItem] = useState<FmeaReportItem | null>(null);
  const [editingItem, setEditingItem] = useState<FmeaReportItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  async function saveItem(draft: FmeaItemDraft) {
    if (!editingItem || !onEditItem) return;
    setSavingItem(true);
    try {
      await onEditItem(editingItem, draft);
      setEditingItem(null);
    } finally {
      setSavingItem(false);
    }
  }
  return <SectionCard className="report-details-card" title={t("report.fullDetails")} description={t("report.fullDetailsDescription")} icon="fmea">
    <details open>
      <summary>{t("report.expandDetails")}</summary>
      {loading && <div className="fmea-report-ai-seed-status" role="status" aria-live="polite"><span className="spinner"/>{t("report.aiDetailsWorking")}</div>}
      {error && <div className="fmea-report-ai-seed-status error" role="alert"><span>{error}</span><button type="button" className="text-button" onClick={onRetry}>{t("common.retry")}</button></div>}
      {items.length ? <FmeaInteractiveReportRiskTable items={items} processName={processName} riskThresholds={riskThresholds} locale={locale} pageSize={FMEA_STAGE_TWO_RISK_PAGE_SIZE} canEdit={canEdit || Boolean(onEditItem)} canDelete={canDelete} canMove={canMove} onView={setViewingItem} onEdit={setEditingItem} onDelete={onDelete ?? (() => undefined)} onMove={onMove ?? (() => undefined)}/> : !loading && !error ? <EmptyState title={t("assessment.noRiskRows")} description={t("assessment.addFirstRisk")} icon="fmea"/> : null}
      {viewingItem && !editingItem && <FmeaReportItemDetailsDialog item={viewingItem} locale={locale} canEdit={canEdit || Boolean(onEditItem)} onClose={() => setViewingItem(null)} onEdit={() => { setEditingItem(viewingItem); setViewingItem(null); }}/>}
    </details>
    {editingItem && onEditItem && <OverlayDialogFrame onClose={() => { if (!savingItem) setEditingItem(null); }} backdropClassName="dialog-backdrop fmea-report-dialog-backdrop" dialogClassName="fmea-report-editor-dialog" ariaLabel={t("assessment.editRiskRow")}><FmeaItemEditor key={editingItem.id} item={editingItem} riskThresholds={riskThresholds} saving={savingItem} onCancel={() => setEditingItem(null)} onSave={saveItem}/></OverlayDialogFrame>}
  </SectionCard>;
}

export function FmeaInteractiveReportRiskTable({ items, processName, evaluationDate, locale, riskThresholds = DEFAULT_THRESHOLDS, pageSize = FMEA_RISK_PAGE_SIZE, canEdit, canDelete = canEdit, canMove = false, showOperations = true, tableActions, onView, onEdit, onDelete, onMove }: { items: FmeaReportItem[]; processName: string; evaluationDate?: string; locale: "fa" | "en"; riskThresholds?: RiskThresholds; pageSize?: number; canEdit: boolean; canDelete?: boolean | ((item: FmeaReportItem) => boolean); canMove?: boolean | ((item: FmeaReportItem, index: number, visibleItems: FmeaReportItem[]) => boolean); showOperations?: boolean; tableActions?: ReactNode; onView: (item: FmeaReportItem) => void; onEdit: (item: FmeaReportItem) => void; onDelete: (item: FmeaReportItem) => void; onMove?: (item: FmeaReportItem, direction: FmeaRowMoveDirection) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const effectivePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : FMEA_RISK_PAGE_SIZE;
  const [riskSearch, setRiskSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [riskSort, setRiskSort] = useState<RiskSortField>("rowNumber");
  const [riskSortDirection, setRiskSortDirection] = useState<"asc" | "desc">("asc");
  const [riskPage, setRiskPage] = useState(1);
  const calculatedItems = useMemo(() => items.map((item) => ({ ...item, ...fmeaRiskValues(item.severity, item.occurrence, item.detection, riskThresholds) })), [items, riskThresholds]);
  const filteredItems = useMemo(() => {
    const query = riskSearch.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
    const rows = calculatedItems.filter((item) => {
      if (riskFilter !== "ALL" && item.riskLevel !== riskFilter) return false;
      if (!query) return true;
      const actions = item.correctiveActions.flatMap((action) => [action.title, action.status, action.priority]);
      return [String(item.rowNumber), processName, item.processStep, item.failureMode, item.effect, item.cause, item.preventiveControls, item.detectionControls, String(item.severity), String(item.occurrence), String(item.detection), String(item.rpn), item.riskLevel, item.recommendation, item.actionPriority, ...actions]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US").includes(query));
    });
    return [...rows].sort((left, right) => {
      const comparison = Number(left[riskSort]) - Number(right[riskSort]);
      return (comparison || left.rowNumber - right.rowNumber) * (riskSortDirection === "asc" ? 1 : -1);
    });
  }, [calculatedItems, locale, processName, riskFilter, riskSearch, riskSort, riskSortDirection]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / effectivePageSize));
  const pageItems = useMemo(() => filteredItems.slice((riskPage - 1) * effectivePageSize, riskPage * effectivePageSize), [effectivePageSize, filteredItems, riskPage]);

  useEffect(() => setRiskPage(1), [calculatedItems, riskFilter, riskSearch, riskSort, riskSortDirection]);
  useEffect(() => setRiskPage((page) => Math.min(page, pageCount)), [pageCount]);

  return <>
    {evaluationDate && <FmeaReportTableContext processName={processName} evaluationDate={evaluationDate}/>}
    {tableActions}
    <div className="risk-table-toolbar fmea-report-table-toolbar"><label className="search-box risk-table-search"><Icon name="search" size={17}/><span className="sr-only">{t("assessment.riskSearch")}</span><input value={riskSearch} onChange={(event) => setRiskSearch(event.target.value)} placeholder={t("assessment.riskSearchPlaceholder")} aria-label={t("assessment.riskSearch")}/></label><div className="risk-table-controls"><label><span>{t("assessment.riskFilter")}</span><StyledSelect value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option value="ALL">{t("assessment.allRiskLevels")}</option><option value="VERY_LOW">{t("status.veryLow")}</option><option value="LOW">{t("status.low")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="HIGH">{t("status.high")}</option><option value="CRITICAL">{t("status.critical")}</option></StyledSelect></label><label><span>{t("assessment.riskSort")}</span><StyledSelect value={riskSort} onChange={(event) => setRiskSort(event.target.value as RiskSortField)}><option value="rowNumber">{t("assessment.sortRow")}</option><option value="rpn">{t("assessment.sortRpn")}</option><option value="severity">{t("assessment.sortSeverity")}</option><option value="occurrence">{t("assessment.sortOccurrence")}</option><option value="detection">{t("assessment.sortDetection")}</option></StyledSelect></label><button type="button" className="ghost risk-sort-direction" onClick={() => setRiskSortDirection((direction) => direction === "asc" ? "desc" : "asc")} aria-label={t("assessment.toggleSortDirection")}>{riskSortDirection === "asc" ? "↑" : "↓"}</button></div></div>
    <FmeaScoreGuide locale={locale}/>
    {pageItems.length ? <TableContainer className="report-data-table-wrap fmea-report-table-wrap"><table className="assessment-report-table fmea-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th>{showOperations && <th>{t("assessment.operations")}</th>}</tr></thead><tbody>{pageItems.map((item) => {
      const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
      const linkedActions = item.correctiveActions;
      const deletable = typeof canDelete === "function" ? canDelete(item) : canDelete;
      const itemIndex = filteredItems.findIndex((candidate) => candidate.id === item.id);
      const movable = Boolean(onMove) && (typeof canMove === "function" ? canMove(item, itemIndex, filteredItems) : canMove);
      return <tr key={item.id}><td data-label={t("assessment.row")} className="report-table-number">{item.rowNumber.toLocaleString(numberLocale)}</td><td data-label={t("assessment.failureMode")} className="report-table-text"><strong>{item.failureMode}</strong></td><td data-label={t("assessment.effect")} className="report-table-text">{item.effect}</td><td data-label={t("assessment.cause")} className="report-table-text">{item.cause}</td><td data-label={t("assessment.existingControls")} className="report-table-text"><div className="report-table-stack">{controls.length ? controls.map((control, index) => <span key={`${item.id}-control-${index}`}>{control}</span>) : <span>—</span>}</div></td><td data-label="S" className="report-table-number">{item.severity.toLocaleString(numberLocale)}</td><td data-label="O" className="report-table-number">{item.occurrence.toLocaleString(numberLocale)}</td><td data-label="D" className="report-table-number">{item.detection.toLocaleString(numberLocale)}</td><td data-label="RPN" className="report-table-number"><strong className="rpn-number">{item.rpn.toLocaleString(numberLocale)}</strong></td><td data-label={t("assessment.riskLevel")} className="report-table-number"><StatusBadge value={item.riskLevel}/></td><td data-label={t("assessment.recommendation")} className="report-table-text"><div className="report-table-stack">{item.recommendation?.trim() && <span><strong>{item.recommendation.trim()}</strong><small><StatusBadge value="SUGGESTED"/></small></span>}{linkedActions.map((action) => <span key={action.id}><strong>{action.title}</strong><small><StatusBadge value={action.status}/> <StatusBadge value={action.priority}/></small></span>)}{!item.recommendation?.trim() && !linkedActions.length && <span>—</span>}</div></td>{showOperations && <td data-label={t("assessment.operations")} className="report-table-number"><div className="report-table-actions" aria-label={t("assessment.operations")}><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${item.failureMode}`} onClick={() => onView(item)}><Icon name="eye" size={15}/></button>{canEdit && <button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={`${t("assessment.editRiskRow")}: ${item.failureMode}`} onClick={() => onEdit(item)}><Icon name="edit" size={15}/></button>}{deletable && <button type="button" className="icon-button danger" title={t("assessment.deleteRow")} aria-label={`${t("assessment.deleteRow")}: ${item.failureMode}`} onClick={() => onDelete(item)}><Icon name="trash" size={15}/></button>}{movable && <><button type="button" className="icon-button fmea-row-move-button" title={t("assessment.moveRowUp")} aria-label={`${t("assessment.moveRowUp")}: ${item.failureMode}`} onClick={() => onMove?.(item, "up")} disabled={itemIndex <= 0}>↑</button><button type="button" className="icon-button fmea-row-move-button" title={t("assessment.moveRowDown")} aria-label={`${t("assessment.moveRowDown")}: ${item.failureMode}`} onClick={() => onMove?.(item, "down")} disabled={itemIndex < 0 || itemIndex >= filteredItems.length - 1}>↓</button></>}</div></td>}</tr>;
    })}</tbody></table></TableContainer> : <EmptyState title={t("assessment.noRiskMatches")} icon="search"/>}
    {pageCount > 1 && <nav className="risk-table-pagination" aria-label={t("assessment.riskPagination")}><span>{t("assessment.riskPageOf", { current: riskPage, total: pageCount })}</span><div><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.max(1, page - 1))} disabled={riskPage === 1}>{t("assessment.previousPage")}</button><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.min(pageCount, page + 1))} disabled={riskPage === pageCount}>{t("assessment.nextPage")}</button></div></nav>}
  </>;
}

export function FmeaReportItemDetailsDialog({ item, locale, canEdit, onClose, onEdit }: { item: FmeaReportItem; locale: "fa" | "en"; canEdit: boolean; onClose: () => void; onEdit: () => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
  return <OverlayDialogFrame onClose={onClose} backdropClassName="dialog-backdrop fmea-report-dialog-backdrop" dialogClassName="fmea-report-dialog" ariaLabelledBy="fmea-report-detail-title">
      <div className="fmea-report-dialog-head"><div><strong id="fmea-report-detail-title">{t("assessment.riskDetails")}</strong><small>{item.failureMode}</small></div><button type="button" className="icon-button" onClick={onClose} aria-label={t("assessment.closeDetails")}><span aria-hidden="true">×</span></button></div>
      <div className="fmea-report-detail-grid">
        <div><span>{t("assessment.row")}</span><strong>{item.rowNumber.toLocaleString(numberLocale)}</strong></div>
        <div><span>{t("assessment.processActivity")}</span><strong>{item.processStep}</strong></div>
        <div><span>{t("assessment.failureMode")}</span><strong>{item.failureMode}</strong></div>
        <div><span>{t("assessment.effect")}</span><strong>{item.effect}</strong></div>
        <div><span>{t("assessment.cause")}</span><strong>{item.cause}</strong></div>
        <div><span>{t("assessment.recommendation")}</span><strong>{item.recommendation?.trim() || "—"}</strong></div>
        <div className="fmea-report-detail-wide"><span>{t("assessment.existingControls")}</span><strong>{controls.length ? controls.join(" · ") : "—"}</strong></div>
      </div>
      <div className="fmea-report-detail-scores"><span><b>S</b>{item.severity.toLocaleString(numberLocale)}</span><span><b>O</b>{item.occurrence.toLocaleString(numberLocale)}</span><span><b>D</b>{item.detection.toLocaleString(numberLocale)}</span><span><b>RPN</b>{item.rpn.toLocaleString(numberLocale)}</span><StatusBadge value={item.riskLevel}/></div>
      <div className="fmea-report-dialog-actions"><button type="button" className="ghost" onClick={onClose}>{t("assessment.closeDetails")}</button>{canEdit && <button type="button" className="primary" onClick={onEdit}><Icon name="edit" size={15}/>{t("assessment.editRiskRow")}</button>}</div>
  </OverlayDialogFrame>;
}
