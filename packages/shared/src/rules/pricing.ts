import { catalog as defaultCatalog, getTask, type Catalog } from "../catalog";
import type { PricedMaterial, TaskCode } from "../schemas";

export interface Estimate {
  priceMin: number;
  priceMax: number;
  minutesMin: number;
  minutesMax: number;
}

export function estimateForTask(code: TaskCode, c: Catalog = defaultCatalog): Estimate {
  const { priceMin, priceMax, minutesMin, minutesMax } = getTask(code, c);
  return { priceMin, priceMax, minutesMin, minutesMax };
}

/** Labor = catalog midpoint, rounded to the nearest 10 pesos. */
export function laborForTask(code: TaskCode, c: Catalog = defaultCatalog): number {
  const t = getTask(code, c);
  return Math.round((t.priceMin + t.priceMax) / 2 / 10) * 10;
}

export interface ReportTotals {
  laborCost: number;
  materialsCost: number;
  total: number;
}

/**
 * SPEC 5.3: labor (sum of catalog midpoints for tasks done) + worker-entered material prices.
 * The AI never prices anything; unitPrice always comes from the worker.
 */
export function computeReportTotals(
  tasksDone: readonly TaskCode[],
  materials: readonly Pick<PricedMaterial, "qty" | "unitPrice">[],
  c: Catalog = defaultCatalog,
): ReportTotals {
  const laborCost = [...new Set(tasksDone)].reduce((sum, t) => sum + laborForTask(t, c), 0);
  const materialsCost = Math.round(materials.reduce((sum, m) => sum + m.qty * m.unitPrice, 0));
  return { laborCost, materialsCost, total: laborCost + materialsCost };
}
