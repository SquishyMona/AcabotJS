import { google } from 'googleapis';
import { auth } from '../../events/ready.js';

export const getCalendar = async (userId, calendarId) => {
	const accessToken = await auth.getAccessToken("google", userId);	
	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3' });
	const result = await calendar.calendars.get({
		calendarId,
	}).catch((error) => {
		console.error('Error getting calendar:', error);
		throw error;
	});

	console.log('Calendar found:', result.data.summary);
	console.log(JSON.stringify(result.data));

	return result.data;
};

