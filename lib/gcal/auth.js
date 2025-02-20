import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKENS_DIR = path.join(process.cwd(), 'tokens');

async function loadSavedCredentialsIfExist(discordUserId) {
	const tokenPath = path.join(TOKENS_DIR, `${discordUserId}.json`);
	try {
		const content = await fs.readFile(tokenPath);
		const credentials = JSON.parse(content);
		return google.auth.fromJSON(credentials);
	} catch (err) {
		console.log(err);
		return null;
	}
}

async function saveCredentials(client, discordUserId) {
	const content = await fs.readFile(CREDENTIALS_PATH);
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	const tokenPath = path.join(TOKENS_DIR, `${discordUserId}.json`);
	await fs.writeFile(tokenPath, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize(discordUserId) {
	let client = await loadSavedCredentialsIfExist(discordUserId);
	if (client) {
		return client;
	}
	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH,
	});
	if (client.credentials) {
		await saveCredentials(client, discordUserId);
	}
	return client;
}

const linkGoogleAccount = async (userId) => {
	try {
		await authorize(userId);
		return true;
	} catch (error) {
		console.error('Error linking Google account:', error);
		throw error;
	}
};

export { linkGoogleAccount, authorize };