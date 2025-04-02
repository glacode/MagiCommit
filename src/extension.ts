import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';
import simpleGit, { SimpleGit } from 'simple-git';

function buildPrompt(diff: string, log: string): string {
    const prompt = `Generate a conventional commit message based on:
Staged changes:
${diff.substring(0, 2000)}
Recent commits:
${log.substring(0, 1000)}
Format: "type(scope): description" (50 chars max summary)
Common types: feat, fix, docs, style, refactor, test, chore`;
    return prompt;
}

//#region setCommitMessage
function getGitExtension() {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    return gitExtension?.getAPI(1);
}

async function setCommitMessage(message: string) {
    const git = getGitExtension();
    if (!git) {
        vscode.window.showErrorMessage("Git extension not found.");
        return;
    }

    const repo = git.repositories[0]; // Assuming there's at least one repository open
    if (repo) {
        repo.inputBox.value = message; // Set the commit message
    } else {
        vscode.window.showErrorMessage("No Git repository found.");
    }
}
//#endregion setCommitMessage



export async function activate(context: vscode.ExtensionContext) {
    const generateCommitMessage = vscode.commands.registerCommand('magicommit.generate', async () => {
        try {
            // Get workspace path
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage("No workspace folder open");
                return;
            }

            // Initialize git with explicit path
            const git: SimpleGit = simpleGit(workspaceFolder.uri.fsPath);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🧙 MagiCommit is working...",
                cancellable: false
            }, async (progress) => {
                // Verify Git repository
                const isRepo = await git.checkIsRepo();
                if (!isRepo) {
                    throw new Error("Not a Git repository");
                }

                // Get staged changes
                const diff = await git.diff(['--cached', 'HEAD']);
                if (!diff.trim()) {
                    throw new Error("No staged changes detected");
                }

                // Get recent commit history
                const log = (await git.log({ n: 5 })).all.map(c => c.message).join('\n');

                // Get API configuration
                const config = vscode.workspace.getConfiguration('magicommit');
                const apiKey = config.get<string>('geminiApiKey');
                if (!apiKey) {
                    throw new Error("Missing Gemini API key in settings");
                }

                // Initialize Gemini AI
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                // Build prompt
                // const prompt = buildPrompt(diff, log);
                const prompt = `Explain probability in 30 words.`;

                // Generate commit message
                progress.report({ message: "Consulting the AI spirits..." });
                const result = await model.generateContent(prompt);
                const message = result.response.text().trim();

                vscode.window.showInformationMessage(message);

                // Insert into commit input
                // await vscode.commands.executeCommand('workbench.view.scm');
                // await vscode.commands.executeCommand('git.commit', message);
                await setCommitMessage(message);

                vscode.window.showInformationMessage('✨ Commit message generated!');
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`🔮 MagiCommit failed: ${errorMessage}`);
            console.error('MagiCommit error:', error);
        }
    });

    context.subscriptions.push(generateCommitMessage);
}