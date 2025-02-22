import functions from '@google-cloud/functions-framework';
import { google } from 'googleapis';
import Firestore from '@google-cloud/firestore';

functions.http('webhooks', async (req, res) => {
	try {
		const auth = new google.auth.GoogleAuth({
			keyFile: `${process.cwd()}/serviceaccount.json`,
			scopes: ['https://www.googleapis.com/auth/calendar'],
		});
		const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/serviceaccount.json` });
		const calendar = google.calendar({ version: 'v3', auth });

		const task = req.get('X-Goog-Resource-State');
		console.log(`Task recieved: ${task}`);

		if (task === 'incremental-sync') {
			console.log('Getting collection from Firestore.');
			const collectionRef = db.collection('synctokens');
			console.log('Getting all documents from collection.');
			const syncTokens = (await collectionRef.get()).docs;
			console.log(`Sync Tokens: ${JSON.stringify(syncTokens)}`);
			console.log('Iterating over all documents.');
			syncTokens.forEach(async (syncToken) => {
				const data = syncToken.data();
				const newChannels = [];
				const sync = new Promise((resolve, reject) => {
					try {
						data.channels.forEach(async (channel) => {
							console.log(`Channel: ${JSON.stringify(channel)}`);
							const result = await calendar.events.list({
								calendarId: channel.calendarId,
								syncToken: channel.syncToken,
							});
							newChannels.push({
								calendarId: channel.calendarId,
								channelId: channel.channelId,
								resourceId: channel.resourceId,
								syncToken: result.data.nextSyncToken,
							});
							console.log(`Calendar ${channel.calendarId} in Guild ${data.guildId} synced`);
						});
						resolve();
					} catch (error) {
						console.error('Error syncing calendars:', error);
						reject(error);
					}
				});
				await sync();
				console.log(`Channels after forEach: ${JSON.stringify(newChannels)}`);
				await syncToken.ref.set({ guildId: data.guildId, channels: newChannels });
			});
			res.send('Sucessfully synced calendars');
			return;
		}

		const calendarIdURI = req.get('X-Goog-Resource-URI').split('/')[6];
		const calendarId = calendarIdURI.replace('%40', '@');
		console.log(`Calendar ID: ${calendarId}`);
		const channelToken = req.get('X-Goog-Channel-Token');
		const guildId = channelToken.split('=')[1];

		if (task === 'sync') {
			const resourceId = req.get('X-Goog-Resource-ID');
			const channelId = req.get('X-Goog-Channel-ID');
			console.log('Getting sync token collection from Firestore.');
			const syncTokensSnapshot = await db.collection('synctokens').get();
			const syncTokens = syncTokensSnapshot.docs.map(doc => doc.data());
			console.log('Recieving a new token.');
			const list = await calendar.events.list({
				calendarId,
			});
			const newSyncToken = list.data.nextSyncToken;
			console.log(`Checking if Guild ${guildId} already exists.`);
			let channels = syncTokens.find((item) => item.guildId === guildId);
			if (!channels) {
				console.log('Guild not found, creating new entry.');
				channels = { guildId, channels: [{ calendarId, resourceId, channelId, syncToken: newSyncToken }] };
				syncTokens.push(channels);
			} else {
				console.log(`Guild found, checking if a watch entry exists for resourceId ${resourceId}.`);
				const index = channels.channels.findIndex((item) => item.resourceId === resourceId);
				if (index === -1) {
					console.log('No watch entry found, creating new entry.');
					channels.channels.push({ calendarId, resourceId, channelId, newSyncToken });
				} else {
					console.log('Watch entry found, stopping current watch and updating entry.');
					calendar.channels.stop({
						requestBody: {
							id: channels.channels[index].channelId,
							resourceId: channels.channels[index].resourceId,
						},
					});
					channels.channels.splice(index, 1, { calendarId, resourceId, channelId, syncToken: newSyncToken });
				}
			}
			console.log('Updating Firestore with new data.');
			await db.collection('synctokens').doc(guildId).set(channels);
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