

import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';
class LogicalErrorRule implements IRule {
    public readonly name = 'Logical Error';
    public readonly bugType = BugType.LOGICAL_ERROR;

    public detect(ast: ParsedAST, sourceCode: string, language: SupportedLanguage): DetectedBug[] {
        try {
            const bugs: DetectedBug[] = [];
            bugs.push(...this.detectDivisionByZero(ast, language));
            bugs.push(...this.detectSelfComparison(ast, language));
            bugs.push(...this.detectWrongAccumulator(ast, language));
            bugs.push(...this.detectOffByOne(ast, language));

            if (language === SupportedLanguage.JAVASCRIPT) {
                bugs.push(...this.detectJavaScriptAST(ast, sourceCode));
            }

            return bugs;
        } catch (err) {
            logger.error('LogicalErrorRule failed', err);
            return [];
        }
    }

    private detectDivisionByZero(ast: ParsedAST, language: SupportedLanguage): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const pattern = /[/%]\s*0(?!\d|\.)/;

        for (let i = 0; i < ast.sourceLines.length; i++) {
            const line = ast.sourceLines[i];
            const trimmed = line.trim();

            if (this.isComment(trimmed, language)) { continue; }

            if (pattern.test(trimmed)) {
                bugs.push(this.createBug(i + 1, 'Division or modulo by zero detected — this will cause a runtime error.', ast, language, Severity.ERROR));
            }
        }
        return bugs;
    }

    private detectSelfComparison(ast: ParsedAST, language: SupportedLanguage): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const pattern = /\b(\w+)\s*(?:===?|!==?)\s*\1\b/;

        for (let i = 0; i < ast.sourceLines.length; i++) {
            const line = ast.sourceLines[i];
            const trimmed = line.trim();

            if (this.isComment(trimmed, language)) { continue; }

            const match = pattern.exec(trimmed);
            if (match) {
                const varName = match[1];
                if (varName && !['true', 'false', 'null', 'undefined'].includes(varName)) {
                    bugs.push(this.createBug(i + 1, `Variable '${varName}' is compared to itself — this is always true/false.`, ast, language, Severity.WARNING));
                }
            }
        }
        return bugs;
    }

    private detectWrongAccumulator(ast: ParsedAST, language: SupportedLanguage): DetectedBug[] {
        const bugs: DetectedBug[] = [];

        for (let i = 0; i < ast.sourceLines.length - 1; i++) {
            const line = ast.sourceLines[i].trim();
            if (this.isComment(line, language)) { continue; }

            const sumInit = /\b(sum|total)\s*=\s*1\s*[;]?\s*$/.exec(line);
            if (sumInit) {
                for (let j = i + 1; j < Math.min(i + 5, ast.sourceLines.length); j++) {
                    if (/\+=/.test(ast.sourceLines[j])) {
                        bugs.push(this.createBug(i + 1, `Accumulator '${sumInit[1]}' initialized to 1 before a summation loop — should be 0.`, ast, language, Severity.WARNING));
                        break;
                    }
                }
            }

            const prodInit = /\b(product|prod)\s*=\s*0\s*[;]?\s*$/.exec(line);
            if (prodInit) {
                for (let j = i + 1; j < Math.min(i + 5, ast.sourceLines.length); j++) {
                    if (/\*=/.test(ast.sourceLines[j])) {
                        bugs.push(this.createBug(i + 1, `Accumulator '${prodInit[1]}' initialized to 0 before a multiplication loop — should be 1.`, ast, language, Severity.WARNING));
                        break;
                    }
                }
            }
        }
        return bugs;
    }

    private detectOffByOne(ast: ParsedAST, language: SupportedLanguage): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const pattern = /(\w+)\[\1\.(length|size)\s*\](?!\s*-)/;

        for (let i = 0; i < ast.sourceLines.length; i++) {
            const line = ast.sourceLines[i].trim();
            if (this.isComment(line, language)) { continue; }

            if (pattern.test(line)) {
                bugs.push(this.createBug(i + 1, 'Off-by-one error: accessing arr[arr.length] is out of bounds — use arr[arr.length - 1].', ast, language, Severity.ERROR));
            }
        }
        return bugs;
    }

    private detectJavaScriptAST(ast: ParsedAST, sourceCode: string): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        this.traverseJS(ast.rawAST, bugs, ast, sourceCode);
        return bugs;
    }

    private traverseJS(node: any, bugs: DetectedBug[], ast: ParsedAST, sourceCode: string): void {
        if (!node || typeof node !== 'object') { return; }

        if (node.type === 'FunctionDeclaration' && node.id?.name) {
            const name = node.id.name.toLowerCase();
            if (name.includes('sum') || name.includes('add') || name.includes('total')) {
                const bodyStr = sourceCode.substring(node.start, node.end);
                if (bodyStr.includes('-') && !bodyStr.includes('+')) {
                    // Possible suspicion, but let's be more specific
                }
            }
        }
        
        if (node.type === 'ReturnStatement' && node.argument?.type === 'BinaryExpression') {
             const bin = node.argument;
             if (bin.operator === '-') {
                  const parentFunc = this.findParentFunction(ast.rawAST, node);
                  if (parentFunc && (parentFunc.id?.name?.toLowerCase().includes('add') || parentFunc.id?.name?.toLowerCase().includes('sum'))) {
                       bugs.push(this.createBug(node.loc.start.line, 'Semantic Logical Error: Function name implies addition but the return statement uses subtraction.', ast, SupportedLanguage.JAVASCRIPT, Severity.WARNING));
                  }
             }
        }

        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') { continue; }
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => this.traverseJS(c, bugs, ast, sourceCode));
            } else if (child && typeof child === 'object' && child.type) {
                this.traverseJS(child, bugs, ast, sourceCode);
            }
        }
    }

    
    private findParentFunction(parent: any, target: any): any {
        if (!parent || typeof parent !== 'object') { return null; }
        
        const search = (node: any, targetNode: any): any => {
             if (!node || typeof node !== 'object') return null;
             
             
             for (const key of Object.keys(node)) {
                  const val = node[key];
                  if (val === targetNode) return node;
                  if (Array.isArray(val)) {
                       if (val.includes(targetNode)) return node;
                  }
             }

             // Recurse
             for (const key of Object.keys(node)) {
                  if (key === 'loc' || key === 'start' || key === 'end') continue;
                  const val = node[key];
                  if (Array.isArray(val)) {
                       for (const c of val) {
                            const res = search(c, targetNode);
                            if (res) {
                                 if (res.type === 'FunctionDeclaration') return res;
                                 return node.type === 'FunctionDeclaration' ? node : res;
                            }
                       }
                  } else if (val && typeof val === 'object' && val.type) {
                       const res = search(val, targetNode);
                       if (res) {
                            if (res.type === 'FunctionDeclaration') return res;
                            return node.type === 'FunctionDeclaration' ? node : res;
                       }
                  }
             }
             return null;
        };

        const result = search(parent, target);
        return result?.type === 'FunctionDeclaration' ? result : null;
    }

    private isComment(line: string, language: SupportedLanguage): boolean {
        if (language === SupportedLanguage.PYTHON) return line.startsWith('#');
        return line.startsWith('//') || line.startsWith('/*') || line.startsWith('*');
    }

    private createBug(line: number, message: string, ast: ParsedAST, language: SupportedLanguage, severity: Severity): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.LOGICAL_ERROR,
            severity,
            line,
            message,
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default LogicalErrorRule;
