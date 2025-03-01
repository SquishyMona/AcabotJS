import { google } from 'googleapis';
import { auth } from '../../events/ready.js';

export const googleCalendarsAutocomplete = async (userId) => {
	const accessToken = await auth.getAccessToken("google", userId);
	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3' });
	const result = await calendar.calendarList.list().catch((error) => {
		console.error('Error getting calendars:', error);
		throw error;
	});

	const calendars = result.data.items;
	if (!calendars || calendars.length === 0) {
		console.log('No calendars found.');
		return false;
	}

	const calendarsList = calendars.map((calendar) => ({ name: calendar.summary, value: calendar.id }));

	return calendarsList;
}