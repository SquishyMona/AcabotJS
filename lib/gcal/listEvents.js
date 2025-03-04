import { google } from 'googleapis';
import { auth } from '../../events/ready.js';

export async function listEvents(userId, calendarId, startDate=null, endDate=null) {
	const auth = new google.auth.GoogleAuth({
		keyFile: `${process.cwd()}/cloud/serviceaccount.json`,
		scopes: ['https://www.googleapis.com/auth/calendar'],
	});

	const calendar = google.calendar({ version: 'v3', auth });

	const requestPayload = { calendarId };
	startDate ? requestPayload.timeMin = new Date(startDate) : null;
	endDate ? requestPayload.timeMax = new Date(endDate) : null;

	const res = await calendar.events.list(requestPayload);
	const events = res.data.items;
	if (!events || events.length === 0) {
		console.log('No upcoming events found.');
		return false;
	}
	return events;
}