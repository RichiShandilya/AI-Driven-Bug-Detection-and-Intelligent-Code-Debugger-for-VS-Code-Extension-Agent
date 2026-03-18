/**
 * @file Java parser using regex and line-based pattern analysis.
 * Extracts structural information from Java source code for bug detection.
 */

import { ParsedAST, SupportedLanguage } from '../types';
import logger from '../utils/logger';

/** Represents a Java variable declaration. */
interface JavaVariable {
    name: string;
    type: string;
    line: number;
}

/** Represents a Java method definition. */
interface JavaMethod {
    name: string;
    returnType: string;
    line: number;
    endLine: number;
    bodyLines: string[];
    hasReturn: boolean;
}

/** Represents a Java loop. */
interface JavaLoop {
    type: 'while' | 'for';
    line: number;
    condition: string;
    bodyLines: string[];
}

/** Represents a Java conditional. */
interface JavaConditional {
    type: 'if' | 'while';
    line: number;
    condition: string;
}

/** Structure of the raw AST produced by the Java parser. */
export interface JavaRawAST {
    variables: JavaVariable[];
    methods: JavaMethod[];
    loops: JavaLoop[];
    conditionals: JavaConditional[];
    callExpressions: string[];
    identifierUsages: string[];
    statements: Array<{ line: number; text: string; braceDepth: number }>;
}

/**
 * Parses Java source code into a structured AST using regex patterns.
 * @param sourceCode - The raw Java source code.
 * @returns A ParsedAST with Java-specific structural data.
 */
export function parseJava(sourceCode: string): ParsedAST {
    const sourceLines = sourceCode.split('\n');
    const rawAST: JavaRawAST = {
        variables: [],
        methods: [],
        loops: [],
        conditionals: [],
        callExpressions: [],
        identifierUsages: [],
        statements: [],
    };

    try {
        extractVariables(sourceLines, rawAST);
        extractMethods(sourceLines, rawAST);
        extractLoops(sourceLines, rawAST);
        extractConditionals(sourceLines, rawAST);
        extractCallExpressions(sourceLines, rawAST);
        extractIdentifierUsages(sourceLines, rawAST);
        extractStatements(sourceLines, rawAST);
    } catch (err) {
        logger.error('Java parser encountered an error', err);
    }

    return { language: SupportedLanguage.JAVA, rawAST, sourceLines };
}

/** Extracts local variable declarations from Java source. */
function extractVariables(lines: string[], ast: JavaRawAST): void {
    const typePattern = /(?:int|long|float|double|String|boolean|char|byte|short|var|final\s+\w+)\s+/;
    const varPattern = new RegExp(
        `^\\s*(?:(?:final|static|private|public|protected)\\s+)*` +
        `(${typePattern.source})(\\w+)\\s*[=;]`
    );

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) { continue; }
        const match = varPattern.exec(lines[i]);
        if (match) {
            ast.variables.push({ name: match[2], type: match[1].trim(), line: i + 1 });
        }
    }
}

/** Extracts method definitions from Java source by finding method signatures. */
function extractMethods(lines: string[], ast: JavaRawAST): void {
    const methodPattern = /^\s*(?:(?:public|private|protected|static|final|abstract|synchronized)\s+)*([\w<>\[\]]+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{?\s*$/;

    for (let i = 0; i < lines.length; i++) {
        const match = methodPattern.exec(lines[i]);
        if (!match) { continue; }

        const returnType = match[1];
        const name = match[2];

        // Skip constructors (name matches class-like pattern with capital first letter and return type is the same)
        if (name === returnType) { continue; }

        const { bodyLines, endLine } = collectBraceBlock(lines, i);
        const hasReturn = bodyLines.some(l => /\breturn\b/.test(l));

        ast.methods.push({ name, returnType, line: i + 1, endLine, bodyLines, hasReturn });
    }
}

/** Extracts while and for loops from Java source. */
function extractLoops(lines: string[], ast: JavaRawAST): void {
    const whilePattern = /^\s*while\s*\((.+)\)\s*\{?\s*$/;
    const forPattern = /^\s*for\s*\(([^)]+)\)\s*\{?\s*$/;

    for (let i = 0; i < lines.length; i++) {
        const whileMatch = whilePattern.exec(lines[i]);
        if (whileMatch) {
            const { bodyLines } = collectBraceBlock(lines, i);
            ast.loops.push({ type: 'while', line: i + 1, condition: whileMatch[1].trim(), bodyLines });
            continue;
        }
        const forMatch = forPattern.exec(lines[i]);
        if (forMatch) {
            const { bodyLines } = collectBraceBlock(lines, i);
            ast.loops.push({ type: 'for', line: i + 1, condition: forMatch[1].trim(), bodyLines });
        }
    }
}

/** Extracts if/while conditions for assignment-in-condition analysis. */
function extractConditionals(lines: string[], ast: JavaRawAST): void {
    const ifPattern = /^\s*(?:if|else\s+if)\s*\((.+)\)\s*\{?\s*$/;
    const whilePattern = /^\s*while\s*\((.+)\)\s*\{?\s*$/;

    for (let i = 0; i < lines.length; i++) {
        const ifMatch = ifPattern.exec(lines[i]);
        if (ifMatch) {
            ast.conditionals.push({ type: 'if', line: i + 1, condition: ifMatch[1].trim() });
            continue;
        }
        const whileMatch = whilePattern.exec(lines[i]);
        if (whileMatch) {
            ast.conditionals.push({ type: 'while', line: i + 1, condition: whileMatch[1].trim() });
        }
    }
}

/** Extracts method call names from Java source. */
function extractCallExpressions(lines: string[], ast: JavaRawAST): void {
    const callPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
    const keywords = ['if', 'else', 'while', 'for', 'switch', 'catch', 'return', 'new', 'class'];

    for (const line of lines) {
        let match: RegExpExecArray | null;
        while ((match = callPattern.exec(line)) !== null) {
            if (!keywords.includes(match[1])) {
                ast.callExpressions.push(match[1]);
            }
        }
    }
}

/** Extracts all identifier usages for unused variable detection. */
function extractIdentifierUsages(lines: string[], ast: JavaRawAST): void {
    const idPattern = /\b([a-zA-Z_]\w*)\b/g;
    for (const line of lines) {
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) { continue; }
        let match: RegExpExecArray | null;
        while ((match = idPattern.exec(line)) !== null) {
            ast.identifierUsages.push(match[1]);
        }
    }
}

/** Extracts all non-empty, non-comment statements with brace depth tracking. */
function extractStatements(lines: string[], ast: JavaRawAST): void {
    let braceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
        const text = lines[i].trim();
        if (text === '' || text.startsWith('//') || text.startsWith('/*') || text.startsWith('*')) { continue; }

        for (const ch of text) {
            if (ch === '{') { braceDepth++; }
            if (ch === '}') { braceDepth--; }
        }

        ast.statements.push({ line: i + 1, text, braceDepth });
    }
}

/** Collects lines within a brace-delimited block starting at the given line. */
function collectBraceBlock(lines: string[], startLine: number): { bodyLines: string[]; endLine: number } {
    const bodyLines: string[] = [];
    let depth = 0;
    let foundOpen = false;
    let endLine = startLine + 1;

    for (let j = startLine; j < lines.length; j++) {
        for (const ch of lines[j]) {
            if (ch === '{') { depth++; foundOpen = true; }
            if (ch === '}') { depth--; }
        }
        if (j > startLine) {
            bodyLines.push(lines[j]);
        }
        endLine = j + 1;
        if (foundOpen && depth <= 0) { break; }
    }

    return { bodyLines, endLine };
}
