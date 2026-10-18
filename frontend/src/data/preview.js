import reports from "./reports.json" with { type: "json" };
import cache from "./extractions_cache.json" with { type: "json" };
import { loadCases } from "../engine/engine.js";

// A fresh, synthetic snapshot. Never reads or writes the dashboard's saved state.
export const previewData = { ...loadCases(reports, cache), reports };
