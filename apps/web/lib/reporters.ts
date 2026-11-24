import type { IndexerReporter } from "@plimsoll/sdk";

/** The three registry roles, in the order they carry weight in a report. */
export type ReporterRole = IndexerReporter["role"];

export const REPORTER_ROLES: readonly ReporterRole[] = ["auditor", "transcriber", "supply_poster"];

export const ROLE_HEADINGS: Record<ReporterRole, string> = {
  auditor: "Auditors",
  transcriber: "Transcribers",
  supply_poster: "Supply posters",
};

export const ROLE_DESCRIPTIONS: Record<ReporterRole, string> = {
  auditor: "Registered auditors can sign a reserve report at the Auditor-signed tier.",
  transcriber: "Transcribers copy a published reserve figure; their reports are Transcribed.",
  supply_poster: "Supply posters post the circulating supply of listed assets.",
};

export interface ReporterGroup {
  role: ReporterRole;
  heading: string;
  description: string;
  reporters: IndexerReporter[];
}

export function isReporterRole(value: string): value is ReporterRole {
  return (REPORTER_ROLES as readonly string[]).includes(value);
}

/**
 * Split the registry into one group per role, in a fixed order so the page
 * does not reshuffle between loads. Names are sorted case-insensitively, with
 * the address as a tie-break. A role this build does not know (a newer
 * indexer) is skipped rather than shown without a heading.
 */
export function groupReporters(list: readonly IndexerReporter[]): ReporterGroup[] {
  const groups: ReporterGroup[] = REPORTER_ROLES.map((role) => ({
    role,
    heading: ROLE_HEADINGS[role],
    description: ROLE_DESCRIPTIONS[role],
    reporters: [],
  }));
  for (const reporter of list) {
    if (!isReporterRole(reporter.role)) continue;
    groups.find((g) => g.role === reporter.role)?.reporters.push(reporter);
  }
  for (const group of groups) {
    group.reporters.sort(
      (a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
        a.address.localeCompare(b.address),
    );
  }
  return groups;
}

/**
 * The registry timestamp as unix seconds, or null when the indexer sent an
 * empty or unparseable value, so the page can show a dash instead of "Invalid
 * Date".
 */
export function updatedAt(iso: string | undefined): { iso: string; epoch: number } | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return { iso, epoch: Math.floor(ms / 1000) };
}
