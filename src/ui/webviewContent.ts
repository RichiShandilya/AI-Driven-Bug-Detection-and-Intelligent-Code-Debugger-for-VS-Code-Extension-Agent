/**
 * @file WebView Content Generator — produces the HTML/CSS/JS for
 * the bug report panel. Dark/light theme aware using VS Code CSS variables.
 * All assets are inline — no external CDN dependencies.
 */

import { AnalysisResult, ExplainedBug, Severity } from '../types';

/**
 * Generates the complete HTML content for the results WebView panel.
 * @param result - The complete analysis result with explained bugs.
 * @returns A full HTML document string for the VS Code WebView.
 */
export function getWebviewContent(result: AnalysisResult): string {
    const fileName = result.filePath.split(/[/\\]/).pop() ?? 'Unknown File';
    const errorCount = result.bugs.filter(b => b.severity === Severity.ERROR).length;
    const warningCount = result.bugs.filter(b => b.severity === Severity.WARNING).length;
    const suggestionCount = result.bugs.filter(b => b.severity === Severity.SUGGESTION).length;

    const bugsHtml = result.bugs.length > 0
        ? result.bugs.map(bug => renderBugCard(bug)).join('\n')
        : renderEmptyState();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Bug Detector — Results</title>
    <style>${getStyles()}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-title">
                <span class="logo">🔍</span>
                <h1>AI Bug Detector</h1>
            </div>
            <p class="file-name">Analyzed: <strong>${escapeHtml(fileName)}</strong></p>
            <p class="meta">
                Language: <strong>${result.language}</strong> ·
                Time: <strong>${result.analysisTimeMs}ms</strong> ·
                ${result.timestamp}
            </p>
        </header>

        <div class="summary-bar">
            <div class="summary-total">
                <span class="summary-number">${result.totalBugs}</span>
                <span class="summary-label">Total Issues</span>
            </div>
            <div class="summary-breakdown">
                <div class="severity-pill error-pill">
                    <span class="pill-dot error-dot"></span>
                    ${errorCount} Error${errorCount !== 1 ? 's' : ''}
                </div>
                <div class="severity-pill warning-pill">
                    <span class="pill-dot warning-dot"></span>
                    ${warningCount} Warning${warningCount !== 1 ? 's' : ''}
                </div>
                <div class="severity-pill suggestion-pill">
                    <span class="pill-dot suggestion-dot"></span>
                    ${suggestionCount} Suggestion${suggestionCount !== 1 ? 's' : ''}
                </div>
            </div>
        </div>

        <div class="bugs-list">
            ${bugsHtml}
        </div>
    </div>
    <script>${getScript()}</script>
</body>
</html>`;
}

/** Renders a single bug card with expandable AI explanation. */
function renderBugCard(bug: ExplainedBug): string {
    const severityClass = bug.severity.toLowerCase();
    const severityLabel = bug.severity;

    return `
    <div class="bug-card" data-id="${escapeHtml(bug.id)}">
        <div class="bug-header">
            <span class="severity-badge ${severityClass}">${severityLabel}</span>
            <span class="bug-type">${escapeHtml(bug.type)}</span>
            <span class="line-number">Line ${bug.line}</span>
        </div>
        <p class="bug-message">${escapeHtml(bug.message)}</p>
        <div class="code-snippet">
            <code>${escapeHtml(bug.codeSnippet)}</code>
        </div>
        <div class="expandable">
            <button class="expand-btn" onclick="toggleExpand(this)">
                ▶ Show AI Explanation
            </button>
            <div class="expand-content hidden">
                <div class="ai-section">
                    <h4>💡 Explanation</h4>
                    <p>${escapeHtml(bug.explanation)}</p>
                </div>
                <div class="ai-section">
                    <h4>🔧 Suggested Fix</h4>
                    <pre class="fix-code"><code>${escapeHtml(bug.suggestedFix)}</code></pre>
                </div>
                ${bug.learnMoreUrl ? `<a class="learn-more" href="${escapeHtml(bug.learnMoreUrl)}">📚 Learn More</a>` : ''}
            </div>
        </div>
    </div>`;
}

/** Renders the empty state when no bugs are found. */
function renderEmptyState(): string {
    return `
    <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h2>No Bugs Found!</h2>
        <p>Your code looks clean. Great job!</p>
    </div>`;
}

/** Returns inline CSS styles using VS Code CSS variables for theming. */
function getStyles(): string {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.6;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header {
            padding: 20px 0;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            margin-bottom: 20px;
        }
        .header-title { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .logo { font-size: 28px; }
        h1 { font-size: 22px; font-weight: 600; }
        .file-name { font-size: 14px; opacity: 0.9; margin-bottom: 4px; }
        .meta { font-size: 12px; opacity: 0.7; }
        .summary-bar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px;
            background: var(--vscode-editorWidget-background, #252526);
            border-radius: 8px; margin-bottom: 24px;
            border: 1px solid var(--vscode-panel-border, #333);
        }
        .summary-total { text-align: center; }
        .summary-number { font-size: 32px; font-weight: 700; display: block; }
        .summary-label { font-size: 12px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
        .summary-breakdown { display: flex; gap: 12px; }
        .severity-pill {
            display: flex; align-items: center; gap: 6px;
            padding: 4px 12px; border-radius: 20px; font-size: 13px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border, #333);
        }
        .pill-dot { width: 8px; height: 8px; border-radius: 50%; }
        .error-dot { background: #f44336; }
        .warning-dot { background: #ff9800; }
        .suggestion-dot { background: #2196f3; }
        .bug-card {
            background: var(--vscode-editorWidget-background, #252526);
            border: 1px solid var(--vscode-panel-border, #333);
            border-radius: 8px; padding: 16px; margin-bottom: 12px;
            transition: border-color 0.2s;
        }
        .bug-card:hover { border-color: var(--vscode-focusBorder, #007acc); }
        .bug-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .severity-badge {
            padding: 2px 10px; border-radius: 12px; font-size: 11px;
            font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .severity-badge.error { background: #f4433620; color: #f44336; border: 1px solid #f4433640; }
        .severity-badge.warning { background: #ff980020; color: #ff9800; border: 1px solid #ff980040; }
        .severity-badge.suggestion { background: #2196f320; color: #2196f3; border: 1px solid #2196f340; }
        .bug-type { font-weight: 600; font-size: 14px; text-transform: capitalize; }
        .line-number {
            margin-left: auto; font-size: 12px; opacity: 0.7;
            background: var(--vscode-editor-background); padding: 2px 8px; border-radius: 4px;
        }
        .bug-message { font-size: 13px; opacity: 0.85; margin-bottom: 10px; }
        .code-snippet {
            background: var(--vscode-editor-background);
            padding: 10px 14px; border-radius: 6px; margin-bottom: 10px;
            overflow-x: auto; font-size: 13px;
            border: 1px solid var(--vscode-panel-border, #333);
        }
        .code-snippet code { font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; white-space: pre; }
        .expand-btn {
            background: none; border: none; cursor: pointer;
            color: var(--vscode-textLink-foreground, #3794ff);
            font-size: 13px; padding: 4px 0;
        }
        .expand-btn:hover { text-decoration: underline; }
        .expand-content { margin-top: 12px; }
        .hidden { display: none; }
        .ai-section { margin-bottom: 12px; }
        .ai-section h4 { font-size: 13px; margin-bottom: 6px; }
        .ai-section p { font-size: 13px; opacity: 0.85; }
        .fix-code {
            background: var(--vscode-editor-background);
            padding: 12px 14px; border-radius: 6px; overflow-x: auto;
            font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
            font-size: 12px; line-height: 1.5;
            border: 1px solid var(--vscode-panel-border, #333);
        }
        .learn-more {
            display: inline-block; margin-top: 8px; font-size: 13px;
            color: var(--vscode-textLink-foreground, #3794ff);
            text-decoration: none;
        }
        .learn-more:hover { text-decoration: underline; }
        .empty-state {
            text-align: center; padding: 60px 20px;
            background: var(--vscode-editorWidget-background, #252526);
            border-radius: 12px;
            border: 1px solid var(--vscode-panel-border, #333);
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state h2 { font-size: 20px; margin-bottom: 8px; }
        .empty-state p { font-size: 14px; opacity: 0.7; }
    `;
}

/** Returns inline JavaScript for expanding/collapsing AI explanations. */
function getScript(): string {
    return `
        function toggleExpand(btn) {
            const content = btn.nextElementSibling;
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                btn.textContent = '▼ Hide AI Explanation';
            } else {
                content.classList.add('hidden');
                btn.textContent = '▶ Show AI Explanation';
            }
        }
    `;
}

/** Escapes HTML special characters to prevent XSS injection. */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
