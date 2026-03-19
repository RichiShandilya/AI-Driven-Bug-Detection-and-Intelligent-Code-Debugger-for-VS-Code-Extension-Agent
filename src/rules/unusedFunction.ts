
import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';


const IGNORED_FUNCTIONS = new Set([
    'main', '__init__', 'constructor', '__main__',
    '__str__', '__repr__', '__len__', '__eq__',
    'toString', 'equals', 'hashCode',
]);


class UnusedFunctionRule implements IRule {
    public readonly name = 'Unused Function';
    public readonly bugType = BugType.UNUSED_FUNCTION;

    public detect(ast: ParsedAST, sourceCode: string, language: SupportedLanguage): DetectedBug[] {
        try {
            switch (language) {
                case SupportedLanguage.PYTHON:
                    return this.detectPython(ast);
                case SupportedLanguage.JAVASCRIPT:
                    return this.detectJavaScript(ast, sourceCode);
                case SupportedLanguage.JAVA:
                    return this.detectJava(ast);
                default:
                    return [];
            }
        } catch (err) {
            logger.error('UnusedFunctionRule failed', err);
            return [];
        }
    }

    private detectPython(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;
        const callSet = new Set<string>(rawAST.callExpressions);

        for (const func of rawAST.functions) {
            if (IGNORED_FUNCTIONS.has(func.name)) { continue; }
            if (!callSet.has(func.name)) {
                bugs.push(this.createBug(func.name, func.line, ast, SupportedLanguage.PYTHON));
            }
        }
        return bugs;
    }

    private detectJavaScript(ast: ParsedAST, sourceCode: string): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const definitions: Array<{ name: string; line: number }> = [];
        const calls = new Set<string>();
        const exports = new Set<string>();

        this.collectJSFunctions(ast.rawAST, definitions, calls, exports);

        for (const def of definitions) {
            if (IGNORED_FUNCTIONS.has(def.name)) { continue; }
            if (exports.has(def.name)) { continue; }
            if (!calls.has(def.name)) {
                bugs.push(this.createBug(def.name, def.line, ast, SupportedLanguage.JAVASCRIPT));
            }
        }
        return bugs;
    }

    private detectJava(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;
        const callSet = new Set<string>(rawAST.callExpressions);

        for (const method of rawAST.methods) {
            if (IGNORED_FUNCTIONS.has(method.name)) { continue; }
            if (method.name === 'main') { continue; }
            if (!callSet.has(method.name)) {
                bugs.push(this.createBug(method.name, method.line, ast, SupportedLanguage.JAVA));
            }
        }
        return bugs;
    }

    private collectJSFunctions(
        node: any,
        defs: Array<{ name: string; line: number }>,
        calls: Set<string>,
        exports: Set<string>,
    ): void {
        if (!node || typeof node !== 'object') { return; }

        if (node.type === 'FunctionDeclaration' && node.id?.name) {
            defs.push({ name: node.id.name, line: node.loc?.start?.line ?? 0 });
        }

        if (node.type === 'CallExpression') {
            if (node.callee?.type === 'Identifier') {
                calls.add(node.callee.name);
            } else if (node.callee?.type === 'MemberExpression' && node.callee.property?.name) {
                calls.add(node.callee.property.name);
            }
        }

        // Exports
        if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
            if (node.declaration?.id?.name) {
                exports.add(node.declaration.id.name);
            }
        }

        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') { continue; }
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => this.collectJSFunctions(c, defs, calls, exports));
            } else if (child && typeof child === 'object' && child.type) {
                this.collectJSFunctions(child, defs, calls, exports);
            }
        }
    }

    private createBug(name: string, line: number, ast: ParsedAST, language: SupportedLanguage): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.UNUSED_FUNCTION,
            severity: Severity.WARNING,
            line,
            message: `Function '${name}' is defined but never called.`,
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default UnusedFunctionRule;
