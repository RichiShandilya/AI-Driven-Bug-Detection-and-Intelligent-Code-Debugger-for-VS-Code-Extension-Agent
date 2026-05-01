/**
 * @file Centralized logging utility for AI Bug Detector.
 * Wraps VS Code OutputChannel to avoid direct console.log usage.
 */

import * as vscode from 'vscode';

/** Singleton logger that writes to a dedicated VS Code Output Channel. */
class Logger {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Bug Detector');
    }

    /**
     * Logs an informational message.
     * @param message - The message to log.
     * @param data - Optional structured data to append.
     */
    public info(message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        const entry = `[INFO  ${timestamp}] ${message}`;
        this.outputChannel.appendLine(data ? `${entry} ${JSON.stringify(data)}` : entry);
    }

    /**
     * Logs a warning message.
     * @param message - The warning message.
     * @param data - Optional structured data to append.
     */
    public warn(message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        const entry = `[WARN  ${timestamp}] ${message}`;
        this.outputChannel.appendLine(data ? `${entry} ${JSON.stringify(data)}` : entry);
    }

    /**
     * Logs an error message.
     * @param message - The error message.
     * @param error - Optional Error object or data to append.
     */
    public error(message: string, error?: unknown): void {
        const timestamp = new Date().toISOString();
        const entry = `[ERROR ${timestamp}] ${message}`;
        if (error instanceof Error) {
            this.outputChannel.appendLine(`${entry} ${error.message}\n${error.stack ?? ''}`);
        } else if (error !== undefined) {
            this.outputChannel.appendLine(`${entry} ${JSON.stringify(error)}`);
        } else {
            this.outputChannel.appendLine(entry);
        }
    }

    /**
     * Logs a debug message (only visible in Output Channel).
     * @param message - The debug message.
     * @param data - Optional structured data to append.
     */
    public debug(message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        const entry = `[DEBUG ${timestamp}] ${message}`;
        this.outputChannel.appendLine(data ? `${entry} ${JSON.stringify(data)}` : entry);
    }

    /** Shows the Output Channel panel to the user. */
    public show(): void {
        this.outputChannel.show();
    }

    /** Disposes the Output Channel. Call on extension deactivation. */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}

/** Singleton logger instance shared across the extension. */
const logger = new Logger();
export default logger;
