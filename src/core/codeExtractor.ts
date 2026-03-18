/**
 * @file Code extractor that reads file content and detects the programming language.
 * Acts as the first stage of the analysis pipeline.
 */

import * as path from 'path';
import { SupportedLanguage } from '../types';
import logger from '../utils/logger';

/** Result returned by the code extractor. */
export interface ExtractedCode {
    /** Absolute path to the source file. */
    filePath: string;
    /** Raw source code content. */
    sourceCode: string;
    /** The detected programming language. */
    language: SupportedLanguage;
}

/** Map of file extensions to supported languages. */
const EXTENSION_MAP: Record<string, SupportedLanguage> = {
    '.py': SupportedLanguage.PYTHON,
    '.js': SupportedLanguage.JAVASCRIPT,
    '.ts': SupportedLanguage.JAVASCRIPT,
    '.jsx': SupportedLanguage.JAVASCRIPT,
    '.tsx': SupportedLanguage.JAVASCRIPT,
    '.java': SupportedLanguage.JAVA,
};

/**
 * Extracts source code and detects the programming language from a file path.
 * @param filePath - Absolute path of the file being analyzed.
 * @param content - Raw source code string from the editor.
 * @returns An ExtractedCode object with language info, or null if unsupported.
 */
export function extractCode(filePath: string, content: string): ExtractedCode | null {
    const ext = path.extname(filePath).toLowerCase();
    const language = EXTENSION_MAP[ext];

    if (!language) {
        logger.warn(`Unsupported file extension: ${ext}`, { filePath });
        return null;
    }

    logger.info(`Extracted code from ${path.basename(filePath)} (${language})`);

    return {
        filePath,
        sourceCode: content,
        language,
    };
}
