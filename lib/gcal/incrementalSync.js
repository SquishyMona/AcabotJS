import { promises as fs } from 'fs';

export const incrementalSync = async () => {
	const linkFile = await fs.readFile(`${process.cwd()}/lib/gcal/links.json`, 'utf8');
	const links = await JSON.parse(linkFile);
	const calendars = [];
	links.forEach(async (link) => calendars.push(link.calendarId));

	const request = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Resource-State': 'incremental-sync',
		},
		body: JSON.stringify(calendars),
	};

	const response = await fetch('https://acabot-webhook-396114486132.us-central1.run.app', request);

	if (!response.ok) {
		console.error('Error syncing calendars:', response.statusText);
		return false;
	}

	console.log('Calendars synced:', response.statusText);
};