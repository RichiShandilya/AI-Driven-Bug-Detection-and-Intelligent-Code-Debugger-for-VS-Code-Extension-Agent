/**
 * @file Extension entry point — registers the "Analyze Current File" command
 * and orchestrates the full analysis pipeline.
 */

import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { extractCode } from './core/codeExtractor';
import { runDetection } from './core/bugDetectionEngine';
import { classifyBugs } from './core/bugClassifier';
import { explainBugs } from './ai/geminiExplainer';
import { showResultsPanel, disposeResultsPanel } from './ui/resultsPanel';
import { AnalysisResult } from './types';
import logger from './utils/logger';

/**
 * Called when the extension is activated (on first command invocation).
 * Registers the analyzeCode command and loads environment variables.
 *
 * @param context - VS Code extension context for subscriptions and storage.
 */
export function activate(context: vscode.ExtensionContext): void {
    // Load .env from the extension directory (where the project actually lives)
    const envPath = path.join(context.extensionPath, '.env');
    dotenv.config({ path: envPath });

    // Fallback: search in workspace folders if not found in extension path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && !process.env.GEMINI_API_KEY) {
        dotenv.config({ path: path.join(workspaceFolders[0].uri.fsPath, '.env') });
        dotenv.config({ path: path.join(workspaceFolders[0].uri.fsPath, 'ai-bug-detector', '.env') });
    }

    logger.info('AI Bug Detector extension activated');

    const command = vscode.commands.registerCommand('aiBugDetector.analyzeCode', async () => {
        await analyzeCurrentFile(context);
    });

    context.subscriptions.push(command);
}

/**
 * Called when the extension is deactivated. Cleans up resources.
 */
export function deactivate(): void {
    disposeResultsPanel();
    logger.info('AI Bug Detector extension deactivated');
}

/**
 * Main analysis pipeline — extracts code, runs detection, gets AI explanations,
 * and displays results in the WebView panel.
 *
 * @param context - VS Code extension context.
 */
async function analyzeCurrentFile(context: vscode.ExtensionContext): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('AI Bug Detector: No active file to analyze. Please open a file first.');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    const content = editor.document.getText();

    // Show progress notification during analysis
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'AI Bug Detector: Analyzing your code...',
            cancellable: false,
        },
        async (progress) => {
            const startTime = Date.now();

            try {
                // Step 1: Extract code and detect language
                progress.report({ message: 'Detecting language...' });
                const extracted = extractCode(filePath, content);

                if (!extracted) {
                    vscode.window.showWarningMessage(
                        'AI Bug Detector: Unsupported file type. Supported: Python (.py), JavaScript (.js/.ts), Java (.java).'
                    );
                    return;
                }

                // Step 2: Run all bug detection rules
                progress.report({ message: 'Running bug detection rules...' });
                const detectedBugs = await runDetection(extracted.sourceCode, extracted.language);

                // Step 3: Classify bugs with verified severity
                const classifiedBugs = classifyBugs(detectedBugs);

                // Step 4: Get AI explanations via Gemini
                progress.report({ message: 'Getting AI explanations...' });
                const explainedBugs = await explainBugs(classifiedBugs);

                const analysisTimeMs = Date.now() - startTime;

                // Step 5: Build analysis result
                const result: AnalysisResult = {
                    filePath: extracted.filePath,
                    language: extracted.language,
                    totalBugs: explainedBugs.length,
                    bugs: explainedBugs,
                    analysisTimeMs,
                    timestamp: new Date().toISOString(),
                };

                // Step 6: Show results in WebView panel
                showResultsPanel(result, context.extensionUri);

                // Show summary notification
                if (result.totalBugs === 0) {
                    vscode.window.showInformationMessage('AI Bug Detector: No bugs found! Your code looks clean. ✅');
                } else {
                    vscode.window.showInformationMessage(
                        `AI Bug Detector: Found ${result.totalBugs} issue(s) in ${analysisTimeMs}ms.`
                    );
                }

                logger.info(`Analysis complete: ${result.totalBugs} bug(s) in ${analysisTimeMs}ms`);
            } catch (err) {
                logger.error('Analysis pipeline failed', err);
                vscode.window.showErrorMessage(
                    'AI Bug Detector: An error occurred during analysis. Check the Output panel for details.'
                );
            }
        }
    );
}
