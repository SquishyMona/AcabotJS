import { Events } from 'discord.js';
import Firestore from '@google-cloud/firestore';
import { eventInsert } from '../lib/gcal/eventInsert.js';
import { eventUpdate } from '../lib/gcal/eventUpdate.js';

export const name = Events.GuildScheduledEventUpdate;

export const execute = async (oldScheduledEvent, newScheduledEvent) => {
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	if (oldScheduledEvent.status !== newScheduledEvent.status) {
		if (newScheduledEvent.status === 3 && newScheduledEvent.recurrenceRule === null) {
			console.log('One time scheduled event has ended, removing Firestore entry.')
			const guild = await db.collection('discordevents').doc(newScheduledEvent.guildId).get();
			if (!guild.exists) {
				console.error('Guild not found in Firestore');
				return;
			} else {
				const events = guild.data().events;
				const eventIndex = events.indexOf(events.find((item) => item.discordId === newScheduledEvent.id));
				if (eventIndex === -1) {
					console.error('Event not found in Firestore');
					return;
				} else {
					events.splice(events[eventIndex]);
					await db.collection('discordevents').doc(newScheduledEvent.guildId).update({ events });
					console.log('Entry removed from Firestore.');
					return;
				}
			}
		} else {
			console.log('Scheduled event status has changed, no need to update Google Calendar');
			return;
		}
	}
	const links = await db.collection('links').doc(newScheduledEvent.guildId).get();
	if (!links.exists || links.data().calendars.length === 0) {
		console.error('No calendars linked to this server');
		return;
	}
	const RecurrenceFrequency = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY'];
	const RecurrenceWeekday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

	const newEvent = {
		'summary': newScheduledEvent.name,
		'description': newScheduledEvent.description,
		'start': {
			'timeZone': 'America/New_York',
		},
		'end': {
			'timeZone': 'America/New_York',
		},
		'location': newScheduledEvent.entityMetadata.location,
	}

	const startISOTimestamp = newScheduledEvent.scheduledStartAt.toISOString().slice(11, 19);
	const endISOTimestamp = newScheduledEvent.scheduledEndAt.toISOString().slice(11, 19);

	if(startISOTimestamp === '00:00:00' && endISOTimestamp === '00:00:00') {
		newEvent.start.date = newScheduledEvent.scheduledStartAt.toISOString().slice(0, 10);
		newEvent.end.date = newScheduledEvent.scheduledEndAt.toISOString().slice(0, 10);
	} else {
		newEvent.start.dateTime = newScheduledEvent.scheduledStartAt.toISOString();
		newEvent.end.dateTime = newScheduledEvent.scheduledEndAt.toISOString();
	}

	if (newScheduledEvent.recurrenceRule) {
		console.log(`Recurrence: ${JSON.stringify(newScheduledEvent.recurrenceRule)}`);
		newEvent.recurrence = ['RRULE:']
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.frequency !== null ? `FREQ=${RecurrenceFrequency[newScheduledEvent.recurrenceRule.frequency]};` : '';
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.interval ? `INTERVAL=${newScheduledEvent.recurrenceRule.interval};` : '';
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.count ? `COUNT=${newScheduledEvent.recurrenceRule.count};` : '';
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.byWeekday ? `BYDAY=${newScheduledEvent.recurrenceRule.byWeekday.map(day => RecurrenceWeekday[day]).join(',')};` : '';
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.byNWeekday ? `BYDAY=${newScheduledEvent.recurrenceRule.byNWeekday.map(nweekday => nweekday.n + RecurrenceWeekday[nweekday.day])};` : '';
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.byMonth ? `BYMONTH=${newScheduledEvent.recurrenceRule.byMonth.map(month => month).join(',')};` : '';
		newEvent.recurrence[0] += newScheduledEvent.recurrenceRule.byMonthDay ? `BYMONTHDAY=${newScheduledEvent.recurrenceRule.byMonthDay.join(',')};` : '';
		console.log(`Recurrence: ${newEvent.recurrence[0]}`);
	}

	const firestoreGuild = await db.collection('discordevents').doc(newScheduledEvent.guildId).get();
	if (!firestoreGuild.exists) {
		console.error('Guild not found in Firestore');
		return;
	} else {
		const events = firestoreGuild.data().events;
		const eventIndex = events.indexOf(events.find((item) => item.discordId === newScheduledEvent.id));
		if (eventIndex === -1) {
			console.log('Event not found in Firestore, creating new entry.');

			const firestoreLinks = await db.collection('links').doc(newScheduledEvent.guildId).get();
			if (!firestoreLinks.exists) {
				console.error('Guild not found in Firestore');
				return;
			}
			const calendarId = firestoreLinks.data().defaultCalendar;

			const response = await eventInsert(newEvent, calendarId);
			events.push({ googleId: response.data.id, discordId: newScheduledEvent.id, calendarId, needsUpdate: true });
			await db.collection('discordevents').doc(newScheduledEvent.guildId).update({ events });
			console.log('Event created in Google Calendar and entry created in Firestore.');
			return;
		} else {
			if(!events[eventIndex].needsUpdate) {
				events[eventIndex].needsUpdate = true;
				await db.collection('discordevents').doc(newScheduledEvent.guildId).update({ events });
				console.log('Event does not need to be updated in Google Calendar, skipping GCal event update');
				return;
			}
			console.log('Event found in Firestore and needs update, sending to Google Calendar.');
			events[eventIndex].needsUpdate = false;
			await db.collection('discordevents').doc(newScheduledEvent.guildId).update({ events });
			await eventUpdate(newEvent, events[eventIndex].calendarId, events[eventIndex].googleId);
			console.log('Event updated in Google Calendar');
		}
	}
}