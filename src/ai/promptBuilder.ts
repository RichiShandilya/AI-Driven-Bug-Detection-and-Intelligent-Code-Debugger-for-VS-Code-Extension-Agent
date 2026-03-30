
import { DetectedBug, BugType, Severity, SupportedLanguage } from '../types';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
    [SupportedLanguage.PYTHON]: 'Python',
    [SupportedLanguage.JAVASCRIPT]: 'JavaScript',
    [SupportedLanguage.JAVA]: 'Java',
};

const BUG_TYPE_LABELS: Record<BugType, string> = {
    [BugType.UNUSED_VARIABLE]: 'Unused Variable',
    [BugType.UNUSED_FUNCTION]: 'Unused Function',
    [BugType.MISSING_RETURN]: 'Missing Return Statement',
    [BugType.INFINITE_LOOP]: 'Infinite Loop',
    [BugType.ASSIGNMENT_IN_CONDITION]: 'Assignment in Condition',
    [BugType.UNREACHABLE_CODE]: 'Unreachable Code',
    [BugType.LOGICAL_ERROR]: 'Logical Error',
};

const SEVERITY_LABELS: Record<Severity, string> = {
    [Severity.ERROR]: 'Error (Critical)',
    [Severity.WARNING]: 'Warning',
    [Severity.SUGGESTION]: 'Suggestion',
};

export function buildPrompt(bug: DetectedBug): string {
    const languageName = LANGUAGE_NAMES[bug.language] ?? bug.language;
    const bugTypeLabel = BUG_TYPE_LABELS[bug.type] ?? bug.type;
    const severityLabel = SEVERITY_LABELS[bug.severity] ?? bug.severity;

    return `You are a friendly coding tutor helping a beginner student.
A bug was found in their ${languageName} code.

Bug Type    : ${bugTypeLabel}
Severity    : ${severityLabel}
Line Number : ${bug.line}
Code Snippet: ${bug.codeSnippet}

Please provide:
1. A simple explanation of what this bug is (2-3 sentences, use simple English, no jargon).
2. Why it is a problem (1-2 sentences).
3. How to fix it (show corrected code snippet).

Format your response as JSON:
{
  "explanation": "string",
  "suggestedFix": "string"
}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`;
}
