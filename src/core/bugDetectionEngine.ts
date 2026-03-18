/**
 * @file Bug Detection Engine — orchestrates parsing and all detection rules.
 * Runs every rule independently using Promise.allSettled so one failing
 * rule never blocks the others.
 */

import { SupportedLanguage, ParsedAST, DetectedBug } from '../types';
import { createParser } from '../parsers/parserFactory';
import allRules from '../rules';
import logger from '../utils/logger';

/**
 * Runs all bug detection rules against the given source code.
 * Each rule runs independently; a failing rule produces zero bugs
 * rather than crashing the entire analysis.
 *
 * @param sourceCode - The raw source code to analyze.
 * @param language - The detected programming language.
 * @returns A promise resolving to an array of all detected bugs.
 */
export async function runDetection(sourceCode: string, language: SupportedLanguage): Promise<DetectedBug[]> {
    logger.info(`Starting bug detection for ${language}`);

    let ast: ParsedAST;
    try {
        ast = createParser(sourceCode, language);
    } catch (err) {
        logger.error('Parser failed — aborting detection', err);
        return [];
    }

    // Run all rules concurrently; Promise.allSettled ensures no single
    // failure blocks other rules from completing.
    const results = await Promise.allSettled(
        allRules.map(rule => {
            return new Promise<DetectedBug[]>((resolve) => {
                try {
                    const bugs = rule.detect(ast, sourceCode, language);
                    logger.info(`Rule "${rule.name}" found ${bugs.length} bug(s)`);
                    resolve(bugs);
                } catch (err) {
                    logger.error(`Rule "${rule.name}" threw an error`, err);
                    resolve([]);
                }
            });
        })
    );

    // Merge all successful results into a single array
    const allBugs: DetectedBug[] = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allBugs.push(...result.value);
        }
    }

    // Sort bugs by line number for consistent output
    allBugs.sort((a, b) => a.line - b.line);

    logger.info(`Detection complete — total bugs found: ${allBugs.length}`);
    return allBugs;
}
