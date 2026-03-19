import * as crypto from 'crypto';
import { IRule, BugType, Severity, SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import logger from '../utils/logger';

class AssignmentInConditionRule implements IRule {
    public readonly name = 'Assignment in Condition';
    public readonly bugType = BugType.ASSIGNMENT_IN_CONDITION;

    
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
            logger.error('AssignmentInConditionRule failed', err);
            return [];
        }
    }

    
    private detectPython(ast: ParsedAST): DetectedBug[] {
        const bugs: DetectedBug[] = [];
        const rawAST = ast.rawAST;

        for (const cond of rawAST.conditionals) {
            
            const assignPattern = /\b\w+\s*=[^=!<>]\s*/;
            const walrusPattern = /:=/;

            if (assignPattern.test(cond.condition) && !walrusPattern.test(cond.condition)) {
                const cleaned = cond.condition.replace(/[!=<>]=/, '');
                if (/\b\w+\s*=\s*\w/.test(cleaned)) {
                    bugs.push(this.createBug(cond.line, ast, SupportedLanguage.PYTHON));
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

        for (const cond of rawAST.conditionals) {
            if (this.hasAssignmentInCondition(cond.condition)) {
                bugs.push(this.createBug(cond.line, ast, SupportedLanguage.JAVA));
            }
        }
        return bugs;
    }

    private traverseJS(node: any, bugs: DetectedBug[], ast: ParsedAST): void {
        if (!node || typeof node !== 'object') { return; }

        if (node.type === 'IfStatement' || node.type === 'WhileStatement') {
            if (this.conditionHasAssignment(node.test)) {
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

    private conditionHasAssignment(node: any): boolean {
        if (!node) { return false; }
        if (node.type === 'AssignmentExpression') { return true; }
        if (node.left && this.conditionHasAssignment(node.left)) { return true; }
        if (node.right && this.conditionHasAssignment(node.right)) { return true; }
        return false;
    }

    private hasAssignmentInCondition(condition: string): boolean {
        const cleaned = condition.replace(/[!=<>]=/g, '').replace(/==/g, '');
        return /\w\s*=\s*\w/.test(cleaned);
    }

    private createBug(line: number, ast: ParsedAST, language: SupportedLanguage): DetectedBug {
        return {
            id: crypto.randomUUID(),
            type: BugType.ASSIGNMENT_IN_CONDITION,
            severity: Severity.ERROR,
            line,
            message: 'Assignment operator (=) used in condition — did you mean equality (== or ===)?',
            codeSnippet: ast.sourceLines[line - 1] ?? '',
            language,
        };
    }
}

export default AssignmentInConditionRule;
