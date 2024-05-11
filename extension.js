// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const crypto = require('crypto');
const RubyMarsh = require('@hyrious/marshal')
const yaml = require('js-yaml');
const fs = require('fs')

var enc = new TextDecoder("utf-8");

const decryptCredentials = (encrypted_string, key) => {
	const parts = encrypted_string.split("--");
	const ciphertext = Buffer.from(parts[0], 'base64');
	const hex_key = Buffer.from(key, 'hex');
	const iv = Buffer.from(parts[1], 'base64');
	const tag = Buffer.from(parts[2], 'base64');

	function decryptAESGCM(ciphertext, key, iv, tag) {
		const decipher = crypto.createDecipheriv('aes-128-gcm', key, iv);
		decipher.setAuthTag(tag);
		const decrypted = decipher.update(ciphertext, 'binary', 'utf8');
		return enc.decode(RubyMarsh.load(decrypted));
	}

	return plaintext = decryptAESGCM(ciphertext, hex_key, iv, tag);
}


function isYamlData(yamlData) {
    try {        
        yaml.load(yamlData);
        return true;
    } catch (e) {
        console.error('Error parsing YAML or reading file:', e);
        return false;
    }
}

function encryptCredentials(data, key) {
	const iv = crypto.randomBytes(12); // Initialization vector (IV) should be unique and unpredictable
	data = Buffer.from(RubyMarsh.dump(data)).toString('utf8')
    const cipher = crypto.createCipheriv('aes-128-gcm', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
    const tag = cipher.getAuthTag(); // Authentication tag for GCM mode
	
	return `${encrypted.toString('base64')}--${iv.toString('base64')}--${tag.toString('base64')}`
}


function railsCredentialDiffSaveCommand(context) {
	return vscode.commands.registerCommand('rails-credentials-diff.saveDiff', async function () {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const uris = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				openLabel: 'Select'
			})

			if (uris.length != 1) {
				return;
			}

			const selectedFileUri = uris[0];

			const encrypted_content = fs.readFileSync(selectedFileUri.path).toString();


			let unencrypted_body = editor.document.getText();

			let isValidYaml = isYamlData(unencrypted_body);

			if (!isValidYaml) {
				vscode.window.showErrorMessage('Unable to save as contents are not valid yaml!');
				return;
			}

			const userInput = await vscode.window.showInputBox({
				prompt: 'Enter your encypted key'
			});

			const lines = encrypted_content.split("\n");
			const local_credentials = lines[1].trim();

			try {
				decryptCredentials(local_credentials, userInput);
			} catch (e) {
				vscode.window.showErrorMessage('Invalid encrypted key entered.');
				return;
			}
			
			const encrypted_credentials = encryptCredentials(unencrypted_body, userInput);

			fs.writeFileSync(selectedFileUri.path, encrypted_credentials);
			
			await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
		}
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(railsCredentialDiffSaveCommand(context))

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "rails-credentials-diff" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('rails-credentials-diff.startDiff', async function () {

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const content = editor.document.getText();

			if(!content.startsWith("<<<<<")) {
				throw new Error("File doesn't seem to have a merge conflict");
			}

			const lines = content.split("\n");
			const local_credentials = lines[1].trim();
			const remote_credentials = lines[3].trim();

			const key = await vscode.window.showInputBox({
				prompt: 'Enter your encypted key'
			});

			if (key == null || key.length != 32) {
				throw new Error("Please enter a valid key");
			}

			const doc1 = await vscode.workspace.openTextDocument({ language: 'plainttext', content: decryptCredentials(local_credentials, key) })
			const doc2 = await vscode.workspace.openTextDocument({ language: 'plainttext', content: decryptCredentials(remote_credentials, key) })

			await vscode.commands.executeCommand('vscode.diff', doc1.uri, doc2.uri, `Diffing Credentials`, { preview: false })
		}
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
