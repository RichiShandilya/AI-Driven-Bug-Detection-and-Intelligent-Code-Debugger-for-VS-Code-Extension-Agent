import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';

const EXIT_PATTERNS = [/\bbreak\b/, /\breturn\b/, /\braise\b/, /\bsys\.exit\b/, /\bthrow\b/, /\bexit\b/];

class InfiniteLoopRule implements IRule {
    public readonly name = 'Infinite Loop';
    public readonly bugType = BugType.INFINITE_LOOP;

    public detect(ast: ParsedAST, sourceCode: string, language: SupportedLanguage): DetectedBug[] {
        try {
            switch (language) {
                case SupportedLanguage.PYTHON:
                case SupportedLanguage.JAVA:
                    return this.detectFromRegexAST(ast, language);
                case SupportedLanguage.JAVASCRIPT:
                    return this.detectJavaScript(ast);
                default:
                    return [];
            }
        } catch (err) {
            logger.error('InfiniteLoopRule failed', err);
            return [];
        }
    }

    private detectFromRegexAST(ast: ParsedAST, language: SupportedLanguage): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const loop of rawAST.loops) {
            if (loop.type === 'while') {
                const condLower = loop.condition.toLowerCase();
                if (condLower === 'true' || condLower === '1') {
                    const hasExit = loop.bodyLines.some(
                        (line: string) => EXIT_PATTERNS.some(p => p.test(line))
                    );
                    if (!hasExit) {
                        bugs.push(this.createBug(loop.line, ast, language));
                    }
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

    private traverseJS(node: any, bugs: DetectedBug[], ast: ParsedAST): void {
        if (!node || typeof node !== 'object') { return; }

        if (node.type === 'WhileStatement') {
            const isLiteralTrue = node.test?.type === 'BooleanLiteral' && node.test.value === true;
            if (isLiteralTrue && !this.hasExitStatement(node.body)) {
                bugs.push(this.createBug(node.loc?.start?.line ?? 0, ast, SupportedLanguage.JAVASCRIPT));
            }
        }

        if (node.type === 'ForStatement') {
            if (this.isInfiniteFor(node)) {
                const line = node.loc?.start?.line ?? 0;
                bugs.push(this.createBug(line, ast, SupportedLanguage.JAVASCRIPT));
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

    private hasExitStatement(body: any): boolean {
        if (!body) { return false; }

        const nodesToSearch = body.type === 'BlockStatement' ? body.body : [body];
        
        const check = (n: any): boolean => {
            if (!n || typeof n !== 'object') { return false; }
            if (['BreakStatement', 'ReturnStatement', 'ThrowStatement'].includes(n.type)) { return true; }
            for (const key of Object.keys(n)) {
                if (key === 'loc' || key === 'start' || key === 'end') { continue; }
                const child = n[key];
                if (Array.isArray(child)) {
                    if (child.some(c => check(c))) { return true; }
                } else if (child && typeof child === 'object' && (child as { type?: string }).type) {
                    if (check(child as { type: string })) { return true; }
                }
            }
            return false;
        };

        return check(body);
    }

    private isInfiniteFor(node: any): boolean {
        if (!node.test && !this.hasExitStatement(node.body)) {
            return true;
        }
        return false;
    }
    private createBug(line: number, ast: ParsedAST, language: SupportedLanguage): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.INFINITE_LOOP,
            severity: Severity.ERROR,
            line,
            message: 'Potential infinite loop detected — no exit condition (break/return) found.',
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default InfiniteLoopRule;
