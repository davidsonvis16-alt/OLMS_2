import { SITE, pagesOf } from "./site";
import type { ModuleRow, Progress } from "./learning";

/** Course rules that pages also need in the browser (no database code here). */
type State = { modules: ModuleRow[]; progress: Map<string, Progress> };

export function moduleUnlocked(state: State, position: number) {
  // Modules open in order: a module unlocks once the previous one is completed.
  const idx = state.modules.findIndex((m) => m.position === position);
  if (idx <= 0) return true;
  return !!state.progress.get(state.modules[idx - 1].id)?.completed_at;
}

export function moduleSlides(m: ModuleRow) { return pagesOf(m); }
export const PASS = SITE.passMark;
