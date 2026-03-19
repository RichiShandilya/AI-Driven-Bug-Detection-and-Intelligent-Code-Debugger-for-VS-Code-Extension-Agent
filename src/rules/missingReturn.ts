

import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';


class MissingReturnRule implements IRule {
    public readonly name = 'Missing Return';
    public readonly bugType = BugType.MISSING_RETURN;

    
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
            logger.error('MissingReturnRule failed', err);
            return [];
        }
    }

        private detectPython(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const func of rawAST.functions || []) {
            const bodyLines = func.bodyLines.filter((l: string) => l.trim().length > 0 && !l.trim().startsWith('#'));
            if (bodyLines.length === 0) { continue; }

            const baseIndent = bodyLines[0].length - bodyLines[0].trimStart().length;
            const hasReturnSomewhere = bodyLines.some((l: string) => l.trim().startsWith('return '));
            const hasBaseReturn = bodyLines.some((l: string) => {
                const indent = l.length - l.trimStart().length;
                return indent === baseIndent && l.trim().startsWith('return ');
            });

            
            if (hasReturnSomewhere && !hasBaseReturn) {
                bugs.push(this.createBug(func.name, func.line, ast, SupportedLanguage.PYTHON));
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
            if (method.returnType === 'void') { continue; }
            if (!method.hasReturn) {
                bugs.push(this.createBug(method.name, method.line, ast, SupportedLanguage.JAVA));
                continue;
            }

            
            const lastLine = this.getLastMeaningfulLine(method.bodyLines);
            if (lastLine && !/\breturn\b/.test(lastLine) && lastLine !== '}') {
                bugs.push(this.createBug(method.name, method.line, ast, SupportedLanguage.JAVA));
            }
        }
        return bugs;
    }

    
    private traverseJS(node: any, bugs: DetectedBug[], ast: ParsedAST): void {
        if (!node || typeof node !== 'object') { return; }

        if (
            (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
             node.type === 'ArrowFunctionExpression') &&
            node.body?.type === 'BlockStatement'
        ) {
            const hasReturnAtAll = this.hasAnyReturn(node.body);
            const hasValueReturn = this.blockHasValueReturn(node.body);
            const isCalculative = this.isCalculativeFunction(node.body);

            if ((hasValueReturn && !this.allPathsReturn(node.body)) || (isCalculative && !hasReturnAtAll)) {
                const name = node.id?.name ?? '(anonymous)';
                const line = node.loc?.start?.line ?? 0;
                bugs.push(this.createBug(name, line, ast, SupportedLanguage.JAVASCRIPT));
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

    
    private hasAnyReturn(block: any): boolean {
        return this.blockHasReturn(block);
    }

    
    private isCalculativeFunction(block: any): boolean {
        if (!block?.body) { return false; }
        
        const calculativeTypes = ['BinaryExpression', 'AssignmentExpression', 'UnaryExpression'];
        
        const check = (n: any): boolean => {
            if (!n || typeof n !== 'object') { return false; }
            if (calculativeTypes.includes(n.type)) { return true; }
            for (const key of Object.keys(n)) {
                if (key === 'loc' || key === 'start' || key === 'end') { continue; }
                const child = n[key];
                if (Array.isArray(child)) {
                    if (child.some(c => check(c))) { return true; }
                } else if (child && typeof child === 'object' && child.type) {
                    if (check(child)) { return true; }
                }
            }
            return false;
        };

        return block.body.some((stmt: any) => check(stmt));
    }

    private blockHasReturn(block: any): boolean {
        if (!block?.body) { return false; }
        return block.body.some((stmt: { type: string }) => stmt.type === 'ReturnStatement');
    }

    private blockHasValueReturn(block: any): boolean {
        if (!block?.body) { return false; }
        return block.body.some(
            (stmt: { type: string; argument?: unknown }) =>
                stmt.type === 'ReturnStatement' && stmt.argument !== null && stmt.argument !== undefined
        );
    }

    
    private allPathsReturn(block: any): boolean {
        if (!block?.body || block.body.length === 0) { return false; }
        const lastStmt = block.body[block.body.length - 1];
        if (lastStmt.type === 'ReturnStatement') { return true; }
        if (lastStmt.type === 'IfStatement') {
            return (
                this.allPathsReturn(lastStmt.consequent) &&
                lastStmt.alternate !== null &&
                this.allPathsReturn(lastStmt.alternate)
            );
        }
        return false;
    }

    private getLastMeaningfulLine(lines: string[]): string | null {
        for (let i = lines.length - 1; i >= 0; i--) {
            const trimmed = lines[i].trim();
            if (trimmed !== '' && !trimmed.startsWith('#') && !trimmed.startsWith('//') && trimmed !== '}') {
                return trimmed;
            }
        }
        return null;
    }

    private createBug(name: string, line: number, ast: ParsedAST, language: SupportedLanguage): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.MISSING_RETURN,
            severity: Severity.ERROR,
            line,
            message: `Function '${name}' has code paths that do not return a value.`,
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default MissingReturnRule;
