import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../../events/ready.js';

export const newWatch = async (userId, calendarId, guildId, webhookUrl) => {
	const accessToken = await auth.getAccessToken("google", userId);

	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3' });
	const newId = uuidv4();
	const data = {
		id: newId,
		type: 'webhook',
		address: 'https://acabot-webhook-396114486132.us-central1.run.app',
		token: `guild=${guildId}&hookurl=${webhookUrl}`,
	};
	const result = await calendar.events.watch({
		calendarId,
		requestBody: data,
	}).catch((error) => {
		console.error('Error watching calendar:', error);
		throw error;
	});

	console.log('Calendar watched:', result.data);
	return result.data;
};