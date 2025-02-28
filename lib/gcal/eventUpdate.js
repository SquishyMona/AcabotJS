import { google } from 'googleapis';

export const eventUpdate = async (calendarEvent, calendarId, eventId) => {
	const auth = new google.auth.GoogleAuth({
		keyFile: `${process.cwd()}/cloud/serviceaccount.json`,
		scopes: ['https://www.googleapis.com/auth/calendar'],
	});
	const calendar = google.calendar({ version: 'v3', auth });

	const response = await calendar.events.update({
		calendarId,
		eventId,
		requestBody: calendarEvent,
	});

	console.log('Event updated:', response.data.htmlLink);
	return response;
};