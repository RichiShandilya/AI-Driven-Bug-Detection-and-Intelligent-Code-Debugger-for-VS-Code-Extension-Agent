/**
 * @file Shared TypeScript type definitions for AI Bug Detector.
 * All enums and interfaces used across the extension are defined here.
 */

/** Enum representing the types of bugs the extension can detect. */
export enum BugType {
    UNUSED_VARIABLE = 'Unused Variable',
    UNUSED_FUNCTION = 'Unused Function',
    MISSING_RETURN = 'Missing Return Statement',
    INFINITE_LOOP = 'Infinite Loop',
    ASSIGNMENT_IN_CONDITION = 'Assignment in Condition',
    UNREACHABLE_CODE = 'Unreachable Code',
    LOGICAL_ERROR = 'Logical Error',
}

/** Enum representing the severity level of a detected bug. */
export enum Severity {
    ERROR = 'ERROR',
    WARNING = 'WARNING',
    SUGGESTION = 'SUGGESTION',
}

/** Enum representing the programming languages supported by the extension. */
export enum SupportedLanguage {
    PYTHON = 'PYTHON',
    JAVASCRIPT = 'JAVASCRIPT',
    JAVA = 'JAVA',
}

/** Interface representing a single detected bug before AI explanation. */
export interface DetectedBug {
    /** Unique identifier for this bug instance (crypto.randomUUID). */
    id: string;
    /** The classification type of this bug. */
    type: BugType;
    /** The severity level of this bug. */
    severity: Severity;
    /** The 1-based line number where the bug occurs. */
    line: number;
    /** Optional 0-based column number where the bug occurs. */
    column?: number;
    /** A concise human-readable description of the bug. */
    message: string;
    /** The source code snippet containing the bug. */
    codeSnippet: string;
    /** The language of the file where the bug was detected. */
    language: SupportedLanguage;
}

/** Interface representing a bug after AI-powered explanation has been added. */
export interface ExplainedBug extends DetectedBug {
    /** AI-generated beginner-friendly explanation of the bug. */
    explanation: string;
    /** AI-generated suggested code fix for the bug. */
    suggestedFix: string;
    /** Optional URL for further learning about this bug type. */
    learnMoreUrl?: string;
}

/** Interface representing the complete analysis result for a file. */
export interface AnalysisResult {
    /** Absolute path to the analyzed file. */
    filePath: string;
    /** The detected language of the analyzed file. */
    language: SupportedLanguage;
    /** Total number of bugs found in the file. */
    totalBugs: number;
    /** Array of all explained bugs found in the file. */
    bugs: ExplainedBug[];
    /** Time taken for the analysis in milliseconds. */
    analysisTimeMs: number;
    /** ISO 8601 timestamp of when the analysis was performed. */
    timestamp: string;
}

/**
 * Interface that all bug detection rule classes must implement.
 * Each rule is responsible for detecting exactly one BugType.
 */
export interface IRule {
    /** Human-readable name of the rule. */
    name: string;
    /** The specific BugType this rule detects. */
    bugType: BugType;
    /**
     * Detects bugs of this rule's type in the given parsed AST.
     * @param ast - The parsed abstract syntax tree of the source file.
     * @param sourceCode - The raw source code string.
     * @param language - The programming language of the source file.
     * @returns An array of detected bugs; empty array if none found.
     */
    detect(ast: ParsedAST, sourceCode: string, language: SupportedLanguage): DetectedBug[];
}

/** Interface representing a parsed abstract syntax tree. */
export interface ParsedAST {
    /** The language of the parsed source file. */
    language: SupportedLanguage;
    /** The raw AST object (structure varies by parser). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw AST varies per parser
    rawAST: any;
    /** The source code split into individual lines. */
    sourceLines: string[];
}
