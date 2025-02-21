import { authorize } from './auth.js';
import { google } from 'googleapis';

export const getCalendar = async (userId, calendarId) => {
	const auth = await authorize(userId).catch((error) => {
		console.error('Error authorizing:', error);
		throw error;
	});

	const calendar = google.calendar({ version: 'v3', auth });
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

