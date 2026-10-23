import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RulaPostureOverlayLayer } from "./AssessmentPages";

const nativePoints = {
  head: { x: 0.64, y: 0.25, confidence: 0.99 },
  shoulder: { x: 0.57, y: 0.24, confidence: 0.99 },
  elbow: { x: 0.56, y: 0.39, confidence: 0.96 },
  wrist: { x: 0.6, y: 0.53, confidence: 0.95 },
  hand: { x: 0.63, y: 0.57, confidence: 0.92 },
  hip: { x: 0.39, y: 0.24, confidence: 0.99 },
  knee: { x: 0.4, y: 0.47, confidence: 0.97 },
  ankle: { x: 0.38, y: 0.69, confidence: 0.98 },
};
function render(points: Record<string, { x: number; y: number; confidence: number }>) {
  return renderToStaticMarkup(<RulaPostureOverlayLayer overlay={{ points }}/>);
}
function line(start: { x: number; y: number }, end: { x: number; y: number }) {
  return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}">`;
}

describe("RULA connected landmark display", () => {
  it("joins the eight native points without fabricating a neck", () => {
    const markup = render(nativePoints);
    expect(markup.match(/<line /g)).toHaveLength(7);
    expect(markup.match(/<circle /g)).toHaveLength(8);
    expect(markup).toContain(line(nativePoints.wrist, nativePoints.hand));
    expect(markup).toContain(line(nativePoints.head, nativePoints.shoulder));
    expect(markup).toContain(line(nativePoints.shoulder, nativePoints.hip));
    expect(markup).toContain(line(nativePoints.hip, nativePoints.knee));
    expect(markup).toContain(line(nativePoints.knee, nativePoints.ankle));
    expect(markup).not.toContain("<title>neck</title>");
  });

  it("uses the visible neck instead of a second head-to-shoulder path", () => {
    const neck = { x: 0.61, y: 0.26, confidence: 0.9 };
    const markup = render({ ...nativePoints, neck });
    expect(markup.match(/<line /g)).toHaveLength(8);
    expect(markup).toContain(line(nativePoints.head, neck));
    expect(markup).toContain(line(neck, nativePoints.shoulder));
    expect(markup).not.toContain(line(nativePoints.head, nativePoints.shoulder));
  });

  it("leaves a gap at an uncertain wrist rather than drawing through it", () => {
    const markup = render({ ...nativePoints, wrist: { ...nativePoints.wrist, confidence: 0.59 } });
    expect(markup).not.toContain("<title>wrist</title>");
    expect(markup).not.toContain(line(nativePoints.elbow, nativePoints.wrist));
    expect(markup).not.toContain(line(nativePoints.wrist, nativePoints.hand));
    expect(markup).not.toContain(line(nativePoints.elbow, nativePoints.hand));
    expect(markup).toContain(line(nativePoints.hip, nativePoints.knee));
  });

  it("preserves gaps for absent and nonfinite joints", () => {
    const { knee: _knee, ...withoutKnee } = nativePoints;
    const markup = render({ ...withoutKnee, head: { ...nativePoints.head, x: Number.NaN } });
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain("<title>head</title>");
    expect(markup).not.toContain("<title>knee</title>");
    expect(markup).not.toContain(line(nativePoints.hip, nativePoints.ankle));
    expect(markup).toContain(line(nativePoints.wrist, nativePoints.hand));
  });

  it("renders no annotation when no overlay is available", () => {
    expect(renderToStaticMarkup(<RulaPostureOverlayLayer/>)).toBe("");
  });
});
