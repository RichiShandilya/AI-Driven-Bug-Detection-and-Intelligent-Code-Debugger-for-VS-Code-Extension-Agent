/**
 * @file Parser factory that selects the correct language parser.
 * Enforces parser isolation — each parser is independent with no shared state.
 */

import { SupportedLanguage, ParsedAST } from '../types';
import { parsePython } from './pythonParser';
import { parseJavaScript } from './jsParser';
import { parseJava } from './javaParser';
import logger from '../utils/logger';

/**
 * Returns a parsed AST for the given source code by selecting the correct parser.
 * @param sourceCode - The raw source code string.
 * @param language - The detected programming language.
 * @returns A ParsedAST ready for rule-based analysis.
 * @throws Error if the language is not supported (should never happen due to enum).
 */
export function createParser(sourceCode: string, language: SupportedLanguage): ParsedAST {
    logger.info(`Creating parser for language: ${language}`);

    switch (language) {
        case SupportedLanguage.PYTHON:
            return parsePython(sourceCode);

        case SupportedLanguage.JAVASCRIPT:
            return parseJavaScript(sourceCode);

        case SupportedLanguage.JAVA:
            return parseJava(sourceCode);

        default: {
            const exhaustiveCheck: never = language;
            throw new Error(`Unsupported language: ${exhaustiveCheck}`);
        }
    }
}
