import functions from '@google-cloud/functions-framework';
import { google } from 'googleapis';
import { promises as fs } from 'fs';

functions.http('webhooks', async (req, res) => {
	try {
		const auth = new google.auth.GoogleAuth({
			keyFile: `${process.cwd()}/serviceaccount.json`,
			scopes: ['https://www.googleapis.com/auth/calendar'],
		});
		const calendar = google.calendar({ version: 'v3', auth });

		const task = req.get('X-Goog-Resource-State');

		if (task === 'incremental-sync') {
			const file = await fs.readFile(`${process.cwd()}/synctokens.json`, 'utf8');
			const syncTokens = JSON.parse(file);
			syncTokens.forEach(async (syncToken) => {
				const result = await calendar.events.list({
					calendarId: syncToken.calendarId,
					syncToken: syncToken.syncToken,
				});
				console.log(`Calendar ${syncToken.calendarId} synced: ${result.data.updatedMin}`);
			});
			res.send('Sucessfully synced calendars');
		}

		if (task === 'sync') {
			const calendarId = req.get('X-Goog-Calendar-Id');
			const syncToken = req.get('X-Goog-Sync-Token');
			const file = await fs.readFile(`${process.cwd()}/synctokens.json`, 'utf8');
			const syncTokens = JSON.parse(file);
			const index = syncTokens.findIndex((newSyncToken) => newSyncToken.calendarId === calendarId);
			if (index === -1) {
				syncTokens.push({ calendarId, syncToken });
			} else {
				syncTokens[index].syncToken = syncToken;
			}
			await fs.writeFile(`${process.cwd()}/synctokens.json`, JSON.stringify(syncTokens));
			res.send('Sucessfully watched calendar');
		}

		const results = await calendar.events.list({
			calendarId: 'c_02be5751f95d78aafc27982ed6d0eb5f78a64cd69413161ead861c9a85015440@group.calendar.google.com',
			timeMin: new Date().toISOString(),
			maxResults: 10,
			singleEvents: true,
			orderBy: 'startTime',
		});
		console.log(`Results: ${JSON.stringify(results)}`);
		const events = results.data.items;
		if (!events || events.length === 0) {
			console.log('No upcoming events found.');
			res.send('No upcoming events found.');
		}
		console.log(events);
		res.send(results);
		return;
	} catch (error) {
		console.error('Error loading service account:', error);
	}


	res.send('Sucessfully received webhook');
});