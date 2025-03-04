import functions from '@google-cloud/functions-framework';
import { google } from 'googleapis';
import Firestore from '@google-cloud/firestore';
import RRule from 'rrule';

const RecurrenceFrequency = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY'];
const RecurrenceWeekday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

functions.http('webhooks', async (req, res) => {
	try {
		const auth = new google.auth.GoogleAuth({
			keyFile: `${process.cwd()}/serviceaccount.json`,
			scopes: ['https://www.googleapis.com/auth/calendar'],
		});
		const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/serviceaccount.json` });
		const calendar = google.calendar({ version: 'v3', auth });

		const task = req.get('X-Goog-Resource-State');
		const channel = req.get('X-Goog-Channel-ID');
		const resourceId = req.get('X-Goog-Resource-ID');
		console.log(`Task recieved from watch channel \nID:${channel}\nResource ID:${resourceId}\nTask:${task}`);

		if (task === 'incremental-sync') {
			await incrementalSync(db, calendar);
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
			console.log('Listing events and recieving a new token.');
			let list = await calendar.events.list({
				calendarId,
			});

			let morePages = false;

			if (list.data.nextPageToken) {
				morePages = true;
			}

			let newSyncToken = list.data.nextSyncToken;

			while (morePages) {
				console.log('Getting next page of events.');
				const nextPage = await calendar.events.list({
					calendarId,
					pageToken: list.data.nextPageToken,
				});
				nextPage.data.nextPageToken ? morePages = true : morePages = false;
				newSyncToken = nextPage.data.nextSyncToken;
			}
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
					channels.channels.push({ calendarId, resourceId, channelId, syncToken: newSyncToken });
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
			console.log('Creating new discordevents document for guild.');
			await db.collection('discordevents').doc(guildId).set({ events: [] });
			res.send('Sucessfully watched calendar');
			return;
		}


		if (task === 'exists') {
			const channelId = req.get('X-Goog-Channel-ID');
			console.log(`Watch Channel ID: ${channelId}`);
			console.log(`Guild ID: ${guildId}`);
			const doc = await db.collection('synctokens').doc(guildId).get();
			let syncToken = '';
			let eventWebhookUrl = '';
			for await (const channel of doc.data().channels) {
				if (channel.calendarId === calendarId) {
					syncToken = channel.syncToken;
					eventWebhookUrl = doc.data().webhookUrl;
					break;
				}
			};
			console.log(`Webhook URL: ${eventWebhookUrl}`);
			const results = await calendar.events.list({
				calendarId,
				syncToken,
			});
			console.log(`Calendar list results: ${JSON.stringify(results)}`);
			await sendWebhook(eventWebhookUrl, results.data, calendarId, calendar, db, guildId);
			await saveNextSyncToken(guildId, calendarId, results.data.nextSyncToken, doc, db);
			res.send('Successfully sent webhook notification.');
			return;
		};
	} catch (error) {
		console.error(error);
	}

	res.send('Sucessfully received webhook');
});

const sendWebhook = async (url, results, calendarId, calendar, db, guildId) => {
	const data = results.items;
	const calendarName = results.summary;
	console.log(`Webhook data: ${JSON.stringify(data)}`);
	for await (let item of data) {
		if (item.status === 'cancelled') {
			const newResult = await calendar.events.get({ calendarId, eventId: item.id });
			item = newResult.data;
			console.log(`Cancelled event: ${JSON.stringify(item)}`);
		}
		const startDateObject = new Date(item.start.date ? item.start.date : item.start.dateTime);
		const endDateObject = new Date(item.start.date ? item.end.date : item.end.dateTime);
		const startDate = startDateObject.getTime() / 1000;
		const endDate = endDateObject.getTime() / 1000;
		const event = {
			'content': '',
			'embeds': [
				{
					'title': item.summary,
					'description': item.start.date ? `**All day event on <t:${startDate}:D>**` : `**<t:${startDate}:D>**`,
					'fields': [],
				},
			],
			'attachments': [],
		};
		if (!item.start.date) {
			event.embeds[0].fields.push({
				'name': 'Start Time',
				'value': `<t:${startDate}:t>`,
				'inline': true,
			}, {
				'name': 'End Time',
				'value': (endDate - startDate) / (60 * 60 * 24) < 1 ? `<t:${endDate}:t>` : `<t:${endDate}>`,
				'inline': true,
			});
		} else if ((endDate - startDate) / (60 * 60 * 24) > 1) {
			 event.embeds[0].fields.push({
				'name': 'Start Date',
				'value': `<t:${startDate}:D>`,
				'inline': true,
			}, {
				'name': 'End Date',
				'value': `<t:${endDate}:D>`,
				'inline': true,
			});
		}

		if (item.location) {event.embeds[0].fields.push({
			'name': 'Location',
			'value': item.location,
		});}

		if (item.description) {event.embeds[0].fields.push({
			'name': 'Description',
			'value': item.description,
		});}

		event.embeds[0].fields.push({
			'name': 'More Details',
			'value': `[View in Google Calendar](${item.htmlLink})`,
		});

		let changeType = ''
		if (item.status != 'cancelled') {
			const created = new Date(item.created).getTime();
			const updated = new Date(item.updated).getTime();
			if (updated - created > 3000) {
				event.content = `**An event on the "${calendarName}" calendar has been updated!**`;
				event.embeds[0].color = 12436261;
				changeType = 'updated';
			} else {
				event.content = `**A new event has been added to the "${calendarName}" calendar!**`;
				event.embeds[0].color = 3066993;
				changeType = 'added';
			}
		} else {
			event.content = `**An event on the "${calendarName}" calendar has been deleted!**`;
			event.embeds[0].color = 15158332;
			changeType = 'deleted';
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
		}
		console.log('Webhook sent');
		await sendScheduledEvent(item, calendarId, changeType, db, guildId, calendar);
	}
};

const saveNextSyncToken = async (guildId, calendarId, syncToken, doc, db) => {
	const channels = doc.data().channels;
	const index = channels.findIndex((item) => item.calendarId === calendarId);
	channels[index].syncToken = syncToken;
	await db.collection('synctokens').doc(guildId).set({ guildId, webhookUrl: doc.data().webhookUrl, channels });
	console.log('Next sync token saved');
};

const incrementalSync = async (db, calendar) => {
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
		await syncToken.ref.set({ guildId: data.guildId, webhookUrl: data.webhookUrl, channels: newChannels });
	});
};

const sendScheduledEvent = async (calendarEvent, calendarId, status, db, guildId, calendar) => {
	console.log(`Calendar Event: ${JSON.stringify(calendarEvent)}`);
	const requestPayload = {
		method: status === 'added' ? 'POST' : status === 'updated' ? 'PATCH' : 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bot ${process.env.DISCORD_BOT_KEY}`,
		},
		body: ''
	};

	const start = calendarEvent.start.date ? new Date(`${calendarEvent.start.date}T00:00:00-05:00`) : new Date(calendarEvent.start.dateTime).toISOString();
	const end = calendarEvent.end.date ? new Date(`${calendarEvent.end.date}T00:00:00-05:00`) : new Date(calendarEvent.end.dateTime).toISOString();
	const entity_metadata = { location: calendarEvent.location ?? 'No Location Provided' };
	const requestBody = {
		name: calendarEvent.summary,
		entity_metadata: entity_metadata,
		scheduled_start_time: start,
		scheduled_end_time: end,
		privacy_level: 2,
		entity_type: 3,
		description: calendarEvent.description,
	};

	let newRecurrenceRule;
	if (calendarEvent.recurrence && status !== 'deleted') {
		newRecurrenceRule = await parseRecurrenceRule(calendarEvent.recurrence[0].split(':')[1], start, calendar, calendarId, calendarEvent.id);
	}
	if (newRecurrenceRule !== false) {
		requestBody.recurrence_rule = newRecurrenceRule || undefined;
		requestBody.scheduled_start_time = newRecurrenceRule ? new Date(newRecurrenceRule.start).toISOString() : start;
		requestBody.scheduled_end_time = newRecurrenceRule ? new Date(new Date(newRecurrenceRule.start).getTime() + new Date(end).getTime() - new Date(start).getTime()).toISOString() : end;
		requestPayload.body = JSON.stringify(requestBody);
	} else {
		console.log('Recurring event has ended, checking if a Firestore entry exists.');
		const guild = await db.collection('discordevents').doc(guildId).get();
		if (guild.exists) {
			const data = guild.data();
			const event = data.events.indexOf(data.events.find((item) => item.googleId === calendarEvent.id));
			if (event !== -1) {
				console.log('Event found in Firestore, deleting entry and Discord event.');
				const discordEventId = data.events[event].discordId;
				requestPayload.method = 'DELETE';
				const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events/${discordEventId}`, requestPayload);
				if (!response.ok) {
					console.error(`Error deleting scheduled event: ${JSON.stringify(resData)}`);
					return;
				} else {
					console.log('Scheduled event deleted')
				}
				data.events.splice(event, 1);
				await db.collection('discordevents').doc(guildId).set(data);
				console.log('Event deleted from Firestore.');
			} else {
				console.log('Event not found in Firestore, skipping Discord event deletion.');
			}
		}
		return;
	}
	console.log(`Request Payload: ${JSON.stringify(requestPayload)}`);


	if (status === 'added') {
		if (calendarEvent.creator.email === 'public-service@acabotjs.iam.gserviceaccount.com') {
			console.log('Event already created by bot in Discord, skipping Discord event creation.');
			return;
		}
		console.log('Brand new event, sending to Discord.');
		const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events`, requestPayload);
		const resData = await response.json();
		console.log(`Response: ${JSON.stringify(resData)}`);
		if (!response.ok) {
			console.error(`Error sending scheduled event: ${JSON.stringify(resData)}`);
			return;
		}
		console.log('Scheduled event sent, storing data in Firestore.');

		const guild = await db.collection('discordevents').doc(guildId).get();
		
		if (guild.exists) {
			const data = guild.data();
			data.events.push({ googleId: calendarEvent.id, discordId: resData.id, calendarId, needsUpdate: true });
			await db.collection('discordevents').doc(guildId).set(data);
		} else {
			await db.collection('discordevents').doc(guildId).set({ events: [{ googleId: calendarEvent.id, discordId: resData.id, calendarId, needsUpdate: true }] });
		}
		console.log('Scheduled event stored in Firestore.');
	} else {
		console.log('Event already exists, updating Discord.');
		const guild = await db.collection('discordevents').doc(guildId).get();
		const data = await guild.data();
		console.log(`Firestore Data: ${JSON.stringify(data.events)}`);
		const event = data.events.indexOf(data.events.find((item) => item.googleId === calendarEvent.id));
		let discordId = '';
		if (event === -1) {
			if(status === 'deleted') {
				console.log('Deleted event not found in Firestore, skipping.');
				return;
			} else {
				console.log('Event not found in Firestore, adding to Firestore.');
				requestPayload.method = 'POST';
				const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events`, requestPayload);
				const resData = await response.json();	
				console.log(`Response: ${JSON.stringify(resData)}`);
				if (!response.ok) {
					console.error(`Error creating scheduled event: ${JSON.stringify(resData)}`);
					return;
				}
				console.log('Scheduled event created.');	
				data.events.push({ googleId: calendarEvent.id, discordId: resData.id, calendarId, needsUpdate: true });
				await db.collection('discordevents').doc(guildId).set(data);
				console.log('Event added to Firestore.');
				return;
			}
		} else {
			if (!data.events[event].needsUpdate) {
				console.log('Event already updated, switching update status.');
				data.events[event].needsUpdate = true;
				await db.collection('discordevents').doc(guildId).set(data);
				console.log('Update status switched. Skipping Discord event update.');
				return
			}
			data.events[event].needsUpdate = false;
			discordId = data.events[event].discordId
			if (status === 'deleted') {
				data.events.splice(event, 1);
			}
		}
		await db.collection('discordevents').doc(guildId).set(data);
		const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events/${discordId}`, requestPayload);
		const resData = await response.json();
		console.log(`Response: ${JSON.stringify(resData)}`);
		if (!response.ok) {
			console.error(`Error updating scheduled event: ${JSON.stringify(resData)}`);
			return;
		}
		console.log('Scheduled event updated.');
	}
};


const parseRecurrenceRule = async (recurrenceRule, googleStart, calendar, calendarId, eventId) => {
    let newRecurrenceRule = {};

    const startAt = new Date(googleStart);
    const now = new Date();

    if (startAt.getTime() < now.getTime()) {
        //console.log(`Event has already occurred, finding next occurrence`);
        //const dtstart = startAt.toISOString().replace(/[-:.]/g, '').slice(0, -4) + 'Z';
        //const nextOccurrence = getNextOccurrence(`DTSTART:${dtstart}\n${recurrenceRule}`, now);
		const initialList = await calendar.events.instances({
			calendarId,
			eventId,
			timeMin: new Date().toISOString(),
		});
		if (initialList.data.items.length === 0) {
			console.log('No upcoming instances found');
			return false;
		}
		const nextOccurrence = initialList.data.items[0].start.dateTime ? new Date(initialList.data.items[0].start.dateTime) : new Date(`${initialList.data.items[0].start.date}T00:00:00-05:00`);

        console.log(`Next Occurrence: ${nextOccurrence}`);
        newRecurrenceRule.start = nextOccurrence;
    } else {
        newRecurrenceRule.start = startAt;
    }

    console.log(`Recurrence Rule: ${recurrenceRule}`);
    for (const rule of recurrenceRule.split(';')) {
        console.log(`Rule: ${rule}`);
        const [key, value] = rule.split('=');
        switch (key) {
            case 'FREQ':
                newRecurrenceRule.frequency = RecurrenceFrequency.indexOf(value);
                break;
            case 'INTERVAL':
                newRecurrenceRule.interval = parseInt(value, 10);
                break;
            case 'BYDAY':
                newRecurrenceRule.by_weekday = value.includes(',') ? value.split(',') : [RecurrenceWeekday.indexOf(value.slice(-2))];
                break;
            case 'BYMONTH':
                newRecurrenceRule.by_month = value.split(',');
                break;
            case 'BYMONTHDAY':
                newRecurrenceRule.by_monthday = value.split(',');
                break;
        }
    }

    return newRecurrenceRule;
};