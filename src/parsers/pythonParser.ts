/**
 * @file Python parser using regex and line-based analysis.
 * Extracts variable declarations, function definitions, loops,
 * conditionals, and control flow for rule-based bug detection.
 */

import { ParsedAST, SupportedLanguage } from '../types';
import logger from '../utils/logger';

/** Represents a Python variable declaration found via regex. */
interface PythonVariable {
    name: string;
    line: number;
}

/** Represents a Python function definition found via regex. */
interface PythonFunction {
    name: string;
    line: number;
    endLine: number;
    bodyLines: string[];
    hasReturn: boolean;
    hasNonNoneReturn: boolean;
}

/** Represents a Python loop found via regex. */
interface PythonLoop {
    type: 'while' | 'for';
    line: number;
    condition: string;
    bodyLines: string[];
}

/** Represents a Python conditional found via regex. */
interface PythonConditional {
    type: 'if' | 'elif' | 'while';
    line: number;
    condition: string;
}

/** Structure of the raw AST produced by the Python parser. */
export interface PythonRawAST {
    variables: PythonVariable[];
    functions: PythonFunction[];
    loops: PythonLoop[];
    conditionals: PythonConditional[];
    callExpressions: string[];
    identifierUsages: string[];
    statements: Array<{ line: number; text: string; indentLevel: number }>;
}

/**
 * Parses Python source code into a structured AST using regex patterns.
 * @param sourceCode - The raw Python source code.
 * @returns A ParsedAST with Python-specific structural data.
 */
export function parsePython(sourceCode: string): ParsedAST {
    const sourceLines = sourceCode.split('\n');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PythonRawAST conforms at runtime
    const rawAST: PythonRawAST = {
        variables: [],
        functions: [],
        loops: [],
        conditionals: [],
        callExpressions: [],
        identifierUsages: [],
        statements: [],
    };

    try {
        extractVariables(sourceLines, rawAST);
        extractFunctions(sourceLines, rawAST);
        extractLoops(sourceLines, rawAST);
        extractConditionals(sourceLines, rawAST);
        extractCallExpressions(sourceLines, rawAST);
        extractIdentifierUsages(sourceLines, rawAST);
        extractStatements(sourceLines, rawAST);
    } catch (err) {
        logger.error('Python parser encountered an error', err);
    }

    return { language: SupportedLanguage.PYTHON, rawAST, sourceLines };
}

/** Extracts variable assignments (x = value) from Python source lines. */
function extractVariables(lines: string[], ast: PythonRawAST): void {
    const varPattern = /^(\s*)([a-zA-Z_]\w*)\s*=\s*(?!=)/;
    const skipPatterns = [/^\s*def\s/, /^\s*class\s/, /^\s*#/, /^\s*if\s/, /^\s*elif\s/, /^\s*for\s/];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (skipPatterns.some(p => p.test(line))) { continue; }
        const match = varPattern.exec(line);
        if (match) {
            ast.variables.push({ name: match[2], line: i + 1 });
        }
    }
}

/** Extracts function definitions (def name(...):) from Python source lines. */
function extractFunctions(lines: string[], ast: PythonRawAST): void {
    const funcPattern = /^(\s*)def\s+([a-zA-Z_]\w*)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
        const match = funcPattern.exec(lines[i]);
        if (!match) { continue; }

        const indent = match[1].length;
        const bodyLines: string[] = [];
        let endLine = i + 1;
        let hasReturn = false;
        let hasNonNoneReturn = false;

        for (let j = i + 1; j < lines.length; j++) {
            const currentLine = lines[j];
            if (currentLine.trim() === '' || currentLine.trim().startsWith('#')) {
                bodyLines.push(currentLine);
                endLine = j + 1;
                continue;
            }
            const currentIndent = currentLine.length - currentLine.trimStart().length;
            if (currentIndent <= indent) { break; }
            bodyLines.push(currentLine);
            endLine = j + 1;

            if (/\breturn\b/.test(currentLine)) {
                hasReturn = true;
                if (!/\breturn\s*$/.test(currentLine.trim()) && !/\breturn\s+None\s*$/.test(currentLine.trim())) {
                    hasNonNoneReturn = true;
                }
            }
        }

        ast.functions.push({
            name: match[2],
            line: i + 1,
            endLine,
            bodyLines,
            hasReturn,
            hasNonNoneReturn,
        });
    }
}

/** Extracts while and for loop constructs from Python source lines. */
function extractLoops(lines: string[], ast: PythonRawAST): void {
    const whilePattern = /^(\s*)while\s+(.+)\s*:/;
    const forPattern = /^(\s*)for\s+(.+)\s+in\s+/;

    for (let i = 0; i < lines.length; i++) {
        const whileMatch = whilePattern.exec(lines[i]);
        if (whileMatch) {
            const indent = whileMatch[1].length;
            const bodyLines = collectBlock(lines, i, indent);
            ast.loops.push({ type: 'while', line: i + 1, condition: whileMatch[2].trim(), bodyLines });
            continue;
        }
        const forMatch = forPattern.exec(lines[i]);
        if (forMatch) {
            const indent = forMatch[1].length;
            const bodyLines = collectBlock(lines, i, indent);
            ast.loops.push({ type: 'for', line: i + 1, condition: forMatch[2].trim(), bodyLines });
        }
    }
}

/** Extracts if/elif/while conditions for assignment-in-condition checks. */
function extractConditionals(lines: string[], ast: PythonRawAST): void {
    const patterns: Array<{ type: 'if' | 'elif' | 'while'; regex: RegExp }> = [
        { type: 'if', regex: /^\s*if\s+(.+)\s*:/ },
        { type: 'elif', regex: /^\s*elif\s+(.+)\s*:/ },
        { type: 'while', regex: /^\s*while\s+(.+)\s*:/ },
    ];

    for (let i = 0; i < lines.length; i++) {
        for (const { type, regex } of patterns) {
            const match = regex.exec(lines[i]);
            if (match) {
                ast.conditionals.push({ type, line: i + 1, condition: match[1].trim() });
            }
        }
    }
}

/** Extracts function call names from Python source lines. */
function extractCallExpressions(lines: string[], ast: PythonRawAST): void {
    const callPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
    for (const line of lines) {
        let match: RegExpExecArray | null;
        while ((match = callPattern.exec(line)) !== null) {
            if (!['if', 'elif', 'while', 'for', 'def', 'class', 'return', 'print'].includes(match[1])) {
                ast.callExpressions.push(match[1]);
            }
        }
    }
}

/** Extracts all identifier usages for unused variable detection. */
function extractIdentifierUsages(lines: string[], ast: PythonRawAST): void {
    const idPattern = /\b([a-zA-Z_]\w*)\b/g;
    for (const line of lines) {
        if (line.trim().startsWith('#')) { continue; }
        let match: RegExpExecArray | null;
        while ((match = idPattern.exec(line)) !== null) {
            ast.identifierUsages.push(match[1]);
        }
    }
}

/** Extracts all statements with their indentation level. */
function extractStatements(lines: string[], ast: PythonRawAST): void {
    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        if (text.trim() === '' || text.trim().startsWith('#')) { continue; }
        const indentLevel = text.length - text.trimStart().length;
        ast.statements.push({ line: i + 1, text: text.trim(), indentLevel });
    }
}

/** Collects all lines belonging to an indented block starting after the given line. */
function collectBlock(lines: string[], startLine: number, parentIndent: number): string[] {
    const body: string[] = [];
    for (let j = startLine + 1; j < lines.length; j++) {
        const line = lines[j];
        if (line.trim() === '' || line.trim().startsWith('#')) {
            body.push(line);
            continue;
        }
        const indent = line.length - line.trimStart().length;
        if (indent <= parentIndent) { break; }
        body.push(line);
    }
    return body;
}
