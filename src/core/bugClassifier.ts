/**
 * @file Bug Classifier — assigns/validates severity levels and
 * enriches bug metadata with type-specific defaults.
 */

import { DetectedBug, BugType, Severity } from '../types';
import logger from '../utils/logger';

/** Default severity mapping per bug type. */
const SEVERITY_MAP: Record<BugType, Severity> = {
    [BugType.UNUSED_VARIABLE]: Severity.WARNING,
    [BugType.UNUSED_FUNCTION]: Severity.WARNING,
    [BugType.MISSING_RETURN]: Severity.ERROR,
    [BugType.INFINITE_LOOP]: Severity.ERROR,
    [BugType.ASSIGNMENT_IN_CONDITION]: Severity.ERROR,
    [BugType.UNREACHABLE_CODE]: Severity.WARNING,
    [BugType.LOGICAL_ERROR]: Severity.ERROR,
};

/** Human-readable labels for each bug type. */
const BUG_LABELS: Record<BugType, string> = {
    [BugType.UNUSED_VARIABLE]: 'Unused Variable',
    [BugType.UNUSED_FUNCTION]: 'Unused Function',
    [BugType.MISSING_RETURN]: 'Missing Return Statement',
    [BugType.INFINITE_LOOP]: 'Infinite Loop',
    [BugType.ASSIGNMENT_IN_CONDITION]: 'Assignment in Condition',
    [BugType.UNREACHABLE_CODE]: 'Unreachable Code',
    [BugType.LOGICAL_ERROR]: 'Logical Error',
};

/**
 * Classifies and enriches a list of detected bugs with
 * verified severity levels and consistent metadata.
 *
 * @param bugs - Array of raw detected bugs from the engine.
 * @returns The same array with validated severity levels.
 */
export function classifyBugs(bugs: DetectedBug[]): DetectedBug[] {
    logger.info(`Classifying ${bugs.length} bug(s)`);

    return bugs.map(bug => ({
        ...bug,
        severity: SEVERITY_MAP[bug.type] ?? bug.severity,
    }));
}

/**
 * Returns the human-readable label for a given BugType.
 * @param bugType - The BugType enum value.
 * @returns A display-friendly string label.
 */
export function getBugLabel(bugType: BugType): string {
    return BUG_LABELS[bugType] ?? bugType;
}
