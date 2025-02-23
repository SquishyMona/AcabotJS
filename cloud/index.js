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
				try {
					for await (const channel of data.channels) {
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
					};
				} catch (error) {
					console.error('Error syncing calendars:', error);
					reject(error);
				}
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
		console.log(`Channel Token: ${channelToken}`);
		const tokenParams = channelToken.split('&');
		const guildId = tokenParams[0].split('=')[1];
		const webhookUrl = tokenParams[1].split('=')[1];

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
				channels = { guildId, webhookUrl, channels: [{ calendarId, resourceId, channelId, syncToken: newSyncToken }] };
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

		if (task === 'exists') {
			const channelId = req.get('X-Goog-Channel-ID');
			console.log(`Watch Channel ID: ${channelId}`);
			console.log(`Guild ID: ${guildId}`);
			const doc = await db.collection('synctokens').doc(guildId).get();
			let syncToken = '';
			let webhookUrl = '';
			for await (const channel of doc.data().channels) {
				if (channel.calendarId === calendarId) {
					syncToken = channel.syncToken;
					webhookUrl = doc.data().webhookUrl
					break;
				}
			};
			const results = calendar.events.list({
				calendarId,
				syncToken
			});
			await sendWebhook(webhookUrl, results.items, results.summary);
		}	
		
		res.send(results);
		return;
	} catch (error) {
		console.error(error);
	}

	res.send('Sucessfully received webhook');
});

const sendWebhook = async (url, data, calendarName) => {
	const dtformatter = new Intl.DateTimeFormat('en-US', { dateStyle: "long", timeStyle: "short" });
	for await (const item of data) {
		const startDate = dtformatter.format(new Date(item.start.date ?? item.start.dateTime)).split('at');
		const endDate = dtformatter.format(new Date(item.end.date ?? item.end.dateTime)).split('at');	
		const event = {
			"content": '',
			"embeds": [
				{
					"title": item.summary,
					"description": item.start.date ? `All day event on ${startDate[0]}` : startDate[0],
					"fields": []
				}
			],
			"attachments": []
		};
		if (!item.start.date) {
			event.embeds[0].fields.push({
				"name": "Start Time",
				"value": startDate[1].trim(),
				"inline": true
			}, {
				"name": "End Time",
				"value": startDate[0] === endDate[0] ? endDate[1].trim() : dtformatter.format(new Date(item.end.date ?? item.end.dateTime)),
				"inline": true
			});
		} else {
			if (startDate[0] !== endDate[0]) event.embeds[0].fields.push({
				"name": "Start Date",
				"value": startDate[0],
				"inline": true
			}, {
				"name": "End Date",
				"value": endDate[0],
				"inline": true
			});
		}

		if (item.location) event.embeds[0].fields.push({
			"name": "Location",
			"value": item.location
		});
		
		if (item.description) event.embeds[0].fields.push({
			"name": "Description",
			"value": item.description
		});

		event.embeds[0].fields.push({
			"name": "More Details",
			"value": `[View in Google Calendar](${item.htmlLink})`
		});

		if (item.status != 'cancelled') {
			const created = new Date(item.created).getTime();
			const updated = new Date(item.updated).getTime();
			if (updated - created > 3000) {
				event.content = `An event on the ${calendarName} calendar has been updated!`;
				event.embeds[0].color = 12436261
			} else {
				event.content = `A new event has been added to the ${calendarName} calendar!`;
				event.embeds[0].color = 3066993;
			}
		} else {
			event.content = `An event on the ${calendarName} calendar has been deleted!`;
			event.embeds[0].color = 15158332;
		}

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(event),
		});

		if (!response.ok) {
			console.error(`Error sending webhook: ${response.statusText}`);
			return;
		}
		console.log('Webhook sent:', response.statusText);
	}
};