import { google } from 'googleapis';

export const eventDelete = async (calendarId, eventId) => {
	const auth = new google.auth.GoogleAuth({
		keyFile: `${process.cwd()}/cloud/serviceaccount.json`,
		scopes: ['https://www.googleapis.com/auth/calendar'],
	});

	const calendar = google.calendar({ version: 'v3', auth });

	const response = await calendar.events.delete({
		calendarId,
		eventId,
	});

	console.log('Event deleted:', eventId);

	return response;
};