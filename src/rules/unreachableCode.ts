

import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';


const TERMINATOR_PATTERNS = [/\breturn\b/, /\bthrow\b/, /\bbreak\b/, /\bcontinue\b/, /\braise\b/];

class UnreachableCodeRule implements IRule {
    public readonly name = 'Unreachable Code';
    public readonly bugType = BugType.UNREACHABLE_CODE;

    
    public detect(ast: ParsedAST, sourceCode: string, language: SupportedLanguage): DetectedBug[] {
        try {
            switch (language) {
                case SupportedLanguage.PYTHON:
                    return this.detectPython(ast);
                case SupportedLanguage.JAVASCRIPT:
                    return this.detectJavaScript(ast);
                case SupportedLanguage.JAVA:
                    return this.detectJava(ast);
                default:
                    return [];
            }
        } catch (err) {
            logger.error('UnreachableCodeRule failed', err);
            return [];
        }
    }

    
    private detectPython(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const func of rawAST.functions) {
            const funcIndent = this.getPythonFuncBodyIndent(func.bodyLines);
            if (funcIndent < 0) { continue; }

            let foundTerminatorAtLevel: Map<number, boolean> = new Map();
            for (const bodyLine of func.bodyLines) {
                const trimmed = bodyLine.trim();
                if (trimmed === '' || trimmed.startsWith('#')) { continue; }

                const lineIndent = bodyLine.length - bodyLine.trimStart().length;
                
                
                if (foundTerminatorAtLevel.get(lineIndent)) {
                    const lineNum = ast.sourceLines.indexOf(bodyLine) + 1;
                    if (lineNum > 0) {
                        bugs.push(this.createBug(lineNum, ast, SupportedLanguage.PYTHON));
                    }
                    foundTerminatorAtLevel.set(lineIndent, false); 
                }

                if (TERMINATOR_PATTERNS.some(p => p.test(trimmed))) {
                    foundTerminatorAtLevel.set(lineIndent, true);
                }
            }
        }
        return bugs;
    }

    private detectJavaScript(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        this.traverseJS(ast.rawAST, bugs, ast);
        return bugs;
    }

    
    private detectJava(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const method of rawAST.methods) {
            let foundTerminator = false;
            let terminatorDepth = -1;
            let braceDepth = 0;

            for (const bodyLine of method.bodyLines) {
                const trimmed = bodyLine.trim();
                if (trimmed === '' || trimmed.startsWith('//') || trimmed === '}' || trimmed === '{') {
                    for (const ch of trimmed) {
                        if (ch === '{') { braceDepth++; }
                        if (ch === '}') { braceDepth--; }
                    }
                    continue;
                }

                for (const ch of trimmed) {
                    if (ch === '{') { braceDepth++; }
                    if (ch === '}') { braceDepth--; }
                }

                if (foundTerminator && braceDepth === terminatorDepth) {
                    const lineNum = ast.sourceLines.indexOf(bodyLine) + 1;
                    if (lineNum > 0) {
                        bugs.push(this.createBug(lineNum, ast, SupportedLanguage.JAVA));
                    }
                    break;
                }

                if (TERMINATOR_PATTERNS.some(p => p.test(trimmed))) {
                    foundTerminator = true;
                    terminatorDepth = braceDepth;
                }
            }
        }
        return bugs;
    }

    private traverseJS(node: any, bugs: DetectedBug[], ast: ParsedAST): void {
        if (!node || typeof node !== 'object') { return; }

            const meaningfulStatements = node.body.filter((stmt: any) => {
                const text = ast.sourceLines[stmt.loc?.start?.line - 1]?.trim();
                return text && text !== '}' && text !== ');' && text !== '};';
            });

            let foundTerminator = false;
            for (const stmt of meaningfulStatements) {
                if (foundTerminator) {
                    const line = stmt.loc?.start?.line ?? 0;
                    if (line > 0) {
                        bugs.push(this.createBug(line, ast, SupportedLanguage.JAVASCRIPT));
                    }
                    break;
                }
                const terminators = ['ReturnStatement', 'ThrowStatement', 'BreakStatement', 'ContinueStatement'];
                if (terminators.includes(stmt.type)) {
                    foundTerminator = true;
                }
            }

        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') { continue; }
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => this.traverseJS(c, bugs, ast));
            } else if (child && typeof child === 'object' && child.type) {
                this.traverseJS(child, bugs, ast);
            }
        }
    }

    
    private getPythonFuncBodyIndent(bodyLines: string[]): number {
        for (const line of bodyLines) {
            const trimmed = line.trim();
            if (trimmed !== '' && !trimmed.startsWith('#')) {
                return line.length - line.trimStart().length;
            }
        }
        return -1;
    }

    private createBug(line: number, ast: ParsedAST, language: SupportedLanguage): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.UNREACHABLE_CODE,
            severity: Severity.WARNING,
            line,
            message: 'This code is unreachable — it appears after a return, throw, break, or continue statement.',
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default UnreachableCodeRule;
