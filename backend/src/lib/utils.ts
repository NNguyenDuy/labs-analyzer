// ============================================================
// Backend utility types — mirrors frontend utils
// Used in tests only
// ============================================================

import type { Severity } from "../../shared/types";

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  none:     { label: "Normal",   color: "green"  },
  mild:     { label: "Mild",     color: "yellow" },
  moderate: { label: "Moderate", color: "orange" },
  severe:   { label: "Severe",   color: "red"    },
};
