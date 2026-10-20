import { describe, expect, it } from "vitest";
import { buildReportActionProgress } from "./reportActionProgress";

describe("report action progress", () => {
  it("counts only saved nonterminal actions as active and saved COMPLETED actions as complete", () => {
    const progress = buildReportActionProgress({
      actions: [
        { id: "open", title: "Open", status: "OPEN" },
        { id: "assigned", title: "Assigned", status: "ASSIGNED" },
        { id: "running", title: "Running", status: "IN_PROGRESS" },
        { id: "review", title: "Review", status: "WAITING_FOR_REVIEW" },
        { id: "overdue", title: "Overdue", status: "OVERDUE" },
        { id: "done", title: "Done", status: "COMPLETED" },
        { id: "cancelled", title: "Cancelled", status: "CANCELLED" },
        { id: "rejected", title: "Rejected", status: "REJECTED" },
      ],
    });

    expect(progress.registeredActive.map((item) => item.id)).toEqual(["open", "assigned", "running", "review", "overdue"]);
    expect(progress.completed.map((item) => item.id)).toEqual(["done"]);
    expect(progress.remainingSuggestions).toEqual([]);
    expect(progress.totalCount).toBe(6);
    expect(progress.completedPercentage).toBeCloseTo(100 / 6);
  });

  it("keeps unregistered suggestions remaining until a linked persisted action is present", () => {
    const input = {
      actions: [{ id: "saved-1", title: "Registered", status: "OPEN", suggestionId: "suggestion-1" }],
      suggestions: [
        { id: "suggestion-1", title: "Registered" },
        { id: "suggestion-2", title: "Still suggested" },
        { id: "suggestion-2", title: "Duplicate suggestion" },
      ],
    };

    const progress = buildReportActionProgress(input);
    expect(progress.registeredActive.map((item) => item.id)).toEqual(["saved-1"]);
    expect(progress.remainingSuggestions.map((item) => item.id)).toEqual(["suggestion-2"]);
    expect(progress.totalCount).toBe(2);
  });

  it("does not hide a recommendation because its previously linked action was cancelled or rejected", () => {
    const progress = buildReportActionProgress({
      actions: [
        { id: "cancelled", title: "Cancelled", status: "CANCELLED", suggestionId: "suggestion-1" },
        { id: "rejected", title: "Rejected", status: "REJECTED", suggestionId: "suggestion-2" },
      ],
      suggestions: [
        { id: "suggestion-1", title: "Try again after cancellation" },
        { id: "suggestion-2", title: "Try again after rejection" },
      ],
    });

    expect(progress.totalCount).toBe(2);
    expect(progress.remainingSuggestions.map((item) => item.id)).toEqual(["suggestion-1", "suggestion-2"]);
  });

  it("does not count dismissed or unsaved selected suggestions as completion", () => {
    const progress = buildReportActionProgress({
      actions: [{ id: "draft", title: "Unsaved selected", status: "IN_PROGRESS", persisted: false }],
      suggestions: [{ id: "dismissed", title: "Hidden" }, { id: "remaining", title: "Visible" }],
      dismissedSuggestionIds: ["dismissed"],
    });

    expect(progress.registeredActive).toEqual([]);
    expect(progress.completed).toEqual([]);
    expect(progress.remainingSuggestions.map((item) => item.id)).toEqual(["remaining"]);
    expect(progress.totalCount).toBe(1);
    expect(progress.completedPercentage).toBe(0);
  });

  it("keeps a RULA side view isolated and counts a BOTH action once", () => {
    const progress = buildReportActionProgress({
      bodySide: "LEFT",
      actions: [
        { id: "left", title: "Left", status: "OPEN", bodySide: "LEFT" },
        { id: "both", title: "Both", status: "COMPLETED", bodySide: "BOTH" },
        { id: "right", title: "Right", status: "OPEN", bodySide: "RIGHT" },
      ],
      suggestions: [
        { id: "left-rec", title: "Left recommendation", bodySide: "LEFT" },
        { id: "right-rec", title: "Right recommendation", bodySide: "RIGHT" },
      ],
    });

    expect(progress.registeredActive.map((item) => item.id)).toEqual(["left"]);
    expect(progress.completed.map((item) => item.id)).toEqual(["both"]);
    expect(progress.remainingSuggestions.map((item) => item.id)).toEqual(["left-rec"]);
    expect(progress.totalCount).toBe(3);
  });

  it("uses a deliberate zero-item state rather than fictitious completion", () => {
    const progress = buildReportActionProgress({ actions: [], suggestions: [] });
    expect(progress.totalCount).toBe(0);
    expect(progress.completedPercentage).toBe(0);
    expect(progress.registeredActive).toEqual([]);
    expect(progress.completed).toEqual([]);
    expect(progress.remainingSuggestions).toEqual([]);
  });
});
