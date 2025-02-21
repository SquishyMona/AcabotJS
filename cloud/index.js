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
		console.log(`Task: ${task}`);

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
			return;
		}

		const calendarId = req.get('X-Goog-Resource-URI').split('/')[6];
		const channelToken = req.get('X-Goog-Channel-Token');
		const guildId = channelToken.split('=')[1];

		if (task === 'sync') {
			const resourceId = req.get('X-Goog-Resource-ID');
			const channelId = req.get('X-Goog-Channel-ID');
			const file = await fs.readFile(`${process.cwd()}/synctokens.json`, 'utf8');
			const syncTokens = JSON.parse(file);
			const list = await calendar.events.list({
				calendarId,
			});
			const newSyncToken = list.data.nextSyncToken;
			const channels = syncTokens.findIndex((item) => item.guildId === guildId);
			if (channels === -1) {
				syncTokens.push({ guildId, channels: [{resourceId, channelId, newSyncToken}] });
			} else {
				const index = syncTokens[index].channels.findIndex((item) => item.resourceId === resourceId);
				if (index === -1) {
					syncTokens[channels].channels.push({resourceId, channelId, newSyncToken});
				} else {
					calendar.channels.stop({
						calendarId,
						id: syncTokens[channels].channels[index].channelId,
					});
					syncTokens[channels].channels.splice(index, 1, { resourceId, channelId, newSyncToken });
				}			
			}
			await fs.writeFile(`${process.cwd()}/synctokens.json`, JSON.stringify(syncTokens));
			console.log(`Calendar ${calendarId} watched.`);
			res.send('Sucessfully watched calendar');
			return;
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