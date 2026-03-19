

import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';

const LOOP_COUNTERS = new Set(['i', 'j', 'k', 'n', 'x', 'y', 'idx', 'index']);


class UnusedVariableRule implements IRule {
    public readonly name = 'Unused Variable';
    public readonly bugType = BugType.UNUSED_VARIABLE;

    
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
            logger.error('UnusedVariableRule failed', err);
            return [];
        }
    }

    private detectPython(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const variable of rawAST.variables) {
            if (this.shouldIgnore(variable.name)) { continue; }

            const usageCount = rawAST.identifierUsages.filter(
                (id: string) => id === variable.name
            ).length;

            if (usageCount <= 1) {
                bugs.push(this.createBug(variable.name, variable.line, ast, SupportedLanguage.PYTHON));
            }
        }

        return bugs;
    }

    private detectJavaScript(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const declarations: Array<{ name: string; line: number }> = [];
        const usages = new Set<string>();

        this.traverseJS(ast.rawAST, declarations, usages);

        for (const decl of declarations) {
            if (this.shouldIgnore(decl.name)) { continue; }
            if (!usages.has(decl.name)) {
                bugs.push(this.createBug(decl.name, decl.line, ast, SupportedLanguage.JAVASCRIPT));
            }
        }

        return bugs;
    }

    private detectJava(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const variable of rawAST.variables) {
            if (this.shouldIgnore(variable.name)) { continue; }

            const usageCount = rawAST.identifierUsages.filter(
                (id: string) => id === variable.name
            ).length;

            if (usageCount <= 1) {
                bugs.push(this.createBug(variable.name, variable.line, ast, SupportedLanguage.JAVA));
            }
        }

        return bugs;
    }

    
    private traverseJS(node: any, declarations: Array<{ name: string; line: number }>, usages: Set<string>): void {
        if (!node || typeof node !== 'object') { return; }

        
        if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') {
            declarations.push({ name: node.id.name, line: node.id.loc?.start?.line ?? node.loc?.start?.line ?? 0 });
            if (node.init) {
                this.traverseJS(node.init, declarations, usages);
            }
            return; 
        }

        
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
             if (node.id?.type === 'Identifier') {
                  
             }
             if (Array.isArray(node.params)) {
                  node.params.forEach((p: any) => {
                       if (p.type === 'Identifier') {
                            declarations.push({ name: p.name, line: p.loc?.start?.line ?? 0 });
                       }
                  });
             }
        }

        if (node.type === 'Identifier' && node.name) {
            usages.add(node.name);
        }

        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') { continue; }
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => this.traverseJS(c, declarations, usages));
            } else if (child && typeof child === 'object' && child.type) {
                this.traverseJS(child, declarations, usages);
            }
        }
    }

    private shouldIgnore(name: string): boolean {
        return LOOP_COUNTERS.has(name) || name.startsWith('_');
    }

    private createBug(name: string, line: number, ast: ParsedAST, language: SupportedLanguage): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.UNUSED_VARIABLE,
            severity: Severity.WARNING,
            line,
            message: `Variable '${name}' is declared but never used.`,
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default UnusedVariableRule;
