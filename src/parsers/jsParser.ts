/**
 * @file JavaScript/TypeScript parser using @babel/parser.
 * Produces a ParsedAST from JS/TS source code for rule-based analysis.
 */

import * as babelParser from '@babel/parser';
import { ParsedAST, SupportedLanguage } from '../types';
import logger from '../utils/logger';

/**
 * Parses JavaScript or TypeScript source code into a Babel AST.
 * @param sourceCode - The raw JS/TS source code.
 * @returns A ParsedAST containing the Babel AST and source lines.
 */
export function parseJavaScript(sourceCode: string): ParsedAST {
    const sourceLines = sourceCode.split('\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Babel AST is loosely typed
    let rawAST: any = null;

    try {
        rawAST = babelParser.parse(sourceCode, {
            sourceType: 'module',
            plugins: [
                'jsx',
                'typescript',
                'classProperties',
                'optionalChaining',
                'nullishCoalescingOperator',
            ],
            errorRecovery: true,
        });
    } catch (err) {
        logger.error('Babel parser failed, attempting script mode fallback', err);
        try {
            rawAST = babelParser.parse(sourceCode, {
                sourceType: 'script',
                errorRecovery: true,
            });
        } catch (fallbackErr) {
            logger.error('Babel parser fallback also failed', fallbackErr);
            rawAST = { type: 'File', program: { type: 'Program', body: [] } };
        }
    }

    return { language: SupportedLanguage.JAVASCRIPT, rawAST, sourceLines };
}
