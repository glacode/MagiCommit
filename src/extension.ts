import * as vscode from 'vscode';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import simpleGit, { DefaultLogFields, ListLogLine, SimpleGit } from 'simple-git';
import { Init } from 'v8';
import { get } from 'http';



interface WorkingData {
    workSpaceFolder: vscode.WorkspaceFolder | undefined;
    isGitRepo: boolean;
    temperature: number;
    diff: string;
    log: string;
    maxDiffLength: number;
    maxLogLength: number;
    apiKey: string;
}
/**
 * This method is called when your extension is activated.
 */
export async function activate(context: vscode.ExtensionContext) {
    const generateCommitMessage = vscode.commands.registerCommand('magicommit.generate', async () => {
        try {

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🧙 MagiCommit is working...",
                cancellable: false
            }, async (progress) => {
                const workingData: WorkingData = await getWorkingData();
                if (workingData.isGitRepo && workingData.apiKey.length > 0) {
                    const prompt = buildPrompt(workingData.diff, workingData.log, workingData.maxDiffLength, workingData.maxLogLength);
                    console.log(prompt);
                    const message: string = await generateCommitMessageFromPrompt(prompt, workingData, progress);
                    // const message = "test";

                    // Insert into commit input
                    await insertCommitMessageInTextbox(message);
                    // console.log("\nGenerated commit message:", message);

                    vscode.window.showInformationMessage('✨ Commit message generated!');
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`🔮 MagiCommit failed: ${errorMessage}`);
            console.error('MagiCommit error:', error);
        }
    });

    context.subscriptions.push(generateCommitMessage);
}

/**
 * Gets the working data for the extension.
 * @returns {WorkingData} The working data.
 */
async function getWorkingData(): Promise<WorkingData> {
    const workspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.workspaceFolders?.[0];
    const git: SimpleGit = simpleGit(workspaceFolder?.uri.fsPath || '');

    const isGitRepo: boolean = await isGitRepository(git);

    const diff: string = await getDiff(git);

    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('magicommit');

    const log = await getLog(git, config);

    const maxDiffLength: number = config.get<number>('maxDiffLength') || 3000;
    const maxLogLength: number = config.get<number>('maxLogLength') || 3000;

    const apiKey: string = config.get<string>('geminiApiKey') || '';
    if (!apiKey) {
        vscode.window.showErrorMessage("Missing Gemini API key in settings");
    }
    const temperature: number = config.get<number>('temperature') || 0.3;

    return {
        workSpaceFolder: workspaceFolder,
        isGitRepo: isGitRepo,
        temperature: temperature,
        diff: diff.trim(),
        log: log,
        maxDiffLength,
        maxLogLength,
        apiKey
    };
}

/**
 * Gets the recent commit log.
 * @param {SimpleGit} git - The SimpleGit instance.
 * @returns {string} The recent commit log.
 */
async function getLog(git: SimpleGit, config: vscode.WorkspaceConfiguration): Promise<string> {
    const numberOfLogItems: number = config.get<number>('numberOfLogItems') || 5;
    const log = (await git.log({ n: numberOfLogItems })).all.map((c: DefaultLogFields & ListLogLine) =>
        `${c.message}\n${c.body}`).join('\n');
    return log;
}

async function isGitRepository(git: SimpleGit): Promise<boolean> {
    // Initialize git with explicit path
    const isGitRepository = await git.checkIsRepo();
    if (!isGitRepository) {
        vscode.window.showErrorMessage("Not a Git repository");
    }
    return isGitRepository;
}

//#region setCommitMessage
function getGitExtension() {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    return gitExtension?.getAPI(1);
}

async function insertCommitMessageInTextbox(message: string) {
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

/**
 * Builds the prompt for the AI model.
 * @param {string} diff - The diff of staged changes.
 * @param {string} log - The recent commit log.
 * @param {number} maxDiffLength - The maximum length of the diff.
 * @param {number} maxLogLength - The maximum length of the log.
 * @returns {string} The generated prompt.
 */
function buildPrompt(diff: string, log: string, maxDiffLength: number, maxLogLength: number): string {
    const prompt = `Generate a conventional commit message based on:
Staged changes:
${diff.substring(0, maxDiffLength)}
Recent commits:
${log.substring(0, maxLogLength)}

Commit message format (NO CODEBLOCKS):"type(scope): description"
Common types: feat, fix, docs, style, refactor, test, chore
Write summary and details`;
    return prompt;
}

async function generateCommitMessageFromPrompt(prompt: string, workingData: WorkingData,
    progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<string> {
    const generativeModel: GenerativeModel = getGenerativeModel(workingData);
    progress.report({ message: "Consulting the AI spirits..." });
    const result = await generativeModel.generateContent(prompt);
    const message = result.response.text().trim();
    return message;
}

/**
 * Gets the Generative Model instance.
 * @param {WorkingData} workingData - The working data.
 * @returns {GenerativeModel} The Generative Model instance.
 */
function getGenerativeModel(workingData: WorkingData): GenerativeModel {
    const genAI: GoogleGenerativeAI = new GoogleGenerativeAI(workingData.apiKey);
    const model: GenerativeModel = genAI.getGenerativeModel(
        {
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: workingData.temperature
            }
        }
    );
    return model;
}

/**
 * Gets the diff of staged changes.
 * @param {SimpleGit} git - The SimpleGit instance.
 * @returns {Promise<string>} The diff of staged changes.
 */
async function getDiff(git: SimpleGit): Promise<string> {
    const diff: string = await git.diff(['--cached', 'HEAD']);
    if (!diff.trim()) {
        vscode.window.showErrorMessage("No staged changes detected");
    }
    return diff;
}

