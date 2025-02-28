import { google } from 'googleapis';

export const eventInsert = async (calendarEvent, calendarId) => {
	const auth = new google.auth.GoogleAuth({
		keyFile: `${process.cwd()}/cloud/serviceaccount.json`,
		scopes: ['https://www.googleapis.com/auth/calendar'],
	});

	const calendar = google.calendar({ version: 'v3', auth });
	
	const response = await calendar.events.insert({
		calendarId,
		requestBody: calendarEvent,
	});

	console.log('Event created:', response.data.htmlLink);

	return response;
}