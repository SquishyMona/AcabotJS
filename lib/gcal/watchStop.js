import { google } from 'googleapis';
import { authorize } from './auth.js';

export const watchStop = async (userId, resourceId, channelId) => {
	console.log('Stopping watch:', channelId);
	const auth = await authorize(userId).catch((error) => {
		console.error('Error authorizing:', error);
		throw error;
	});

	const calendar = google.calendar({ version: 'v3', auth });

	const response = await calendar.channels.stop({
		requestBody: {
			id: channelId,
			resourceId,
		}
	}).catch((error) => {
		console.error('Error stopping watch:', error);
		throw error;
	});

	console.log('Watch stopped:', response.data);

	return response.data;
}