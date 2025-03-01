import { google } from 'googleapis';
import { auth } from '../../events/ready.js';
export const watchStop = async (userId, resourceId, channelId) => {
	console.log('Stopping watch:', channelId);

	const accessToken = await auth.getAccessToken("google", userId);
	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3' });

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