import { traceable } from "langsmith/traceable";

import { DetectedBug, ExplainedBug, BugType } from '../types';
import { buildPrompt } from './promptBuilder';
import geminiCache from '../utils/cache';
import logger from '../utils/logger';

const API_TIMEOUT_MS = 10_000;

const GEMINI_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';


const FALLBACK_EXPLANATIONS: Record<BugType, { explanation: string; suggestedFix: string }> = {
    [BugType.UNUSED_VARIABLE]: {
        explanation: 'You created a variable but never used it anywhere in your code. This means the variable is taking up space for no reason.',
        suggestedFix: 'Remove the unused variable declaration, or use it in your code where needed.',
    },
    [BugType.UNUSED_FUNCTION]: {
        explanation: 'You wrote a function but never called it anywhere. The function exists but does nothing because no part of your program runs it.',
        suggestedFix: 'Either call the function where needed, or remove it if it is no longer required.',
    },
    [BugType.MISSING_RETURN]: {
        explanation: 'Your function is supposed to give back (return) a value, but some paths through the code do not have a return statement.',
        suggestedFix: 'Add a return statement at the end of every code path in the function to ensure it always returns a value.',
    },
    [BugType.INFINITE_LOOP]: {
        explanation: 'Your loop will run forever because there is no way for it to stop. It has no break, return, or condition that becomes false.',
        suggestedFix: 'Add a break condition, a return statement, or change the loop condition so it eventually becomes false.',
    },
    [BugType.ASSIGNMENT_IN_CONDITION]: {
        explanation: 'You used a single equals sign (=) inside an if or while condition, which assigns a value instead of comparing it. You probably meant to use == or ===.',
        suggestedFix: 'Replace the single = with == (or === in JavaScript) to compare values instead of assigning.',
    },
    [BugType.UNREACHABLE_CODE]: {
        explanation: 'Some code in your function can never run because it appears after a return, break, or throw statement. The program has already left that block.',
        suggestedFix: 'Move the unreachable code before the return/break/throw statement, or remove it if it is not needed.',
    },
    [BugType.LOGICAL_ERROR]: {
        explanation: 'There is a logic mistake in your code that will cause incorrect results or a crash at runtime.',
        suggestedFix: 'Review the flagged line carefully. Common fixes include avoiding division by zero, fixing off-by-one errors, and correcting variable initializations.',
    },
};


export const explainBugs = traceable(async (bugs: DetectedBug[]): Promise<ExplainedBug[]> => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        logger.warn('GEMINI_API_KEY not configured — using fallback explanations');
        return bugs.map(bug => applyFallback(bug));
    }

    const results = await Promise.allSettled(
        bugs.map(bug => explainSingleBug(bug, apiKey))
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        logger.error(`Failed to explain bug ${bugs[index].id}`, result.reason);
        return applyFallback(bugs[index]);
    });
});

async function explainSingleBug(bug: DetectedBug, apiKey: string): Promise<ExplainedBug> {
    const cacheKey = geminiCache.createKey(bug.type, bug.codeSnippet);
    const cached = geminiCache.get(cacheKey);

    if (cached) {
        logger.debug(`Using cached explanation for bug ${bug.id}`);
        return {
            ...bug,
            explanation: cached.explanation,
            suggestedFix: cached.suggestedFix,
        };
    }

    try {
        const prompt = buildPrompt(bug);
        const response = await callGeminiAPI(prompt, apiKey);

        // Cache the successful response
        geminiCache.set(cacheKey, response.explanation, response.suggestedFix);

        return {
            ...bug,
            explanation: response.explanation,
            suggestedFix: response.suggestedFix,
        };
    } catch (err) {
        logger.error(`Gemini API call failed for bug ${bug.id}`, err);
        return applyFallback(bug);
    }
}

async function callGeminiAPI(
    prompt: string,
    apiKey: string,
): Promise<{ explanation: string; suggestedFix: string }> {
    const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }],
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Gemini API returned status ${response.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic API response
        const data: any = await response.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        return parseGeminiResponse(text);
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}


function parseGeminiResponse(text: string): { explanation: string; suggestedFix: string } {
    
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');

    try {
        const parsed = JSON.parse(cleaned);
        return {
            explanation: parsed.explanation ?? 'No explanation provided.',
            suggestedFix: parsed.suggestedFix ?? 'No fix suggestion provided.',
        };
    } catch {
        logger.warn('Failed to parse Gemini response as JSON, using raw text');
        return {
            explanation: text.substring(0, 500),
            suggestedFix: 'Please review the code manually.',
        };
    }
}

function applyFallback(bug: DetectedBug): ExplainedBug {
    const fallback = FALLBACK_EXPLANATIONS[bug.type];
    return {
        ...bug,
        explanation: fallback.explanation,
        suggestedFix: fallback.suggestedFix,
    };
}
