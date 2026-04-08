
import * as vscode from 'vscode';
import { AnalysisResult } from '../types';
import { getWebviewContent } from './webviewContent';
import logger from '../utils/logger';

let currentPanel: vscode.WebviewPanel | undefined;


export function showResultsPanel(result: AnalysisResult, extensionUri: vscode.Uri): void {
    const columnToShowIn = vscode.ViewColumn.Beside;

    if (currentPanel) {
        // Panel already exists — update content and reveal it
        currentPanel.webview.html = getWebviewContent(result);
        currentPanel.reveal(columnToShowIn);
        logger.info('Updated existing results panel');
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'aiBugDetectorResults',
        'AI Bug Detector — Results',
        columnToShowIn,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri],
        },
    );

    currentPanel.webview.html = getWebviewContent(result);

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
        logger.info('Results panel disposed');
    });

    logger.info('Created new results panel');
}

export function disposeResultsPanel(): void {
    if (currentPanel) {
        currentPanel.dispose();
        currentPanel = undefined;
    }
}
