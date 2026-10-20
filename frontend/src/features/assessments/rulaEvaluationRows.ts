export function buildRulaEvaluationRows<P extends { key: string }, A extends { id: string; affectedParts: string[]; persistedId?: string }>(postures: readonly P[], actions: readonly A[]) {
  const keys = new Set(postures.map(posture => posture.key));
  const rows: Array<{ id: string; posture: P | null; action: A | null }> = [];
  for (const posture of postures) {
    const related = actions.filter(action => action.affectedParts.includes(posture.key));
    if (!related.length) rows.push({ id: posture.key, posture, action: null });
    for (const action of related) rows.push({ id: `${posture.key}:${action.persistedId ?? action.id}`, posture, action });
  }
  for (const action of actions.filter(action => !action.affectedParts.some(part => keys.has(part)))) {
    rows.push({ id: `general:${action.persistedId ?? action.id}`, posture: null, action });
  }
  return rows;
}
