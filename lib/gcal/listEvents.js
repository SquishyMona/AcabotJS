import { google } from 'googleapis';
import { auth } from '../../events/ready.js';

export async function listEvents(userId) {
	const accessToken = await auth.getAccessToken("google", userId);
	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3', auth });
	const res = await calendar.events.list({
		calendarId: 'primary',
		timeMin: new Date().toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime',
	});
	const events = res.data.items;
	if (!events || events.length === 0) {
		console.log('No upcoming events found.');
		return false;
	}
	return events;
}