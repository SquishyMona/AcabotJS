import { Events } from 'discord.js';
import { botUserID } from '../index.js';
import Firestore from '@google-cloud/firestore';
import { eventInsert } from '../lib/gcal/eventInsert.js';

export const name = Events.GuildScheduledEventCreate;

export const execute = async (newScheduledEvent) => {
	const RecurrenceFrequency = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY'];
	const RecurrenceWeekday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
	const botId = await botUserID;
	if (newScheduledEvent.creatorId === botId) {
		console.log('Event created in Google Calendar, skipping GCal event creation');
		return;
	}

	console.log('Event created in Discord, creating Google Calendar event');

	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` })
	const firestoreGuild = await db.collection('discordevents').doc(newScheduledEvent.guildId).get();
	const firestoreLink = await db.collection('links').doc(newScheduledEvent.guildId).get();

	if(firestoreLink.data().calendars.length === 0) {
		console.error('No calendars linked to this server');
		return;
	}
	const calendarId = await firestoreLink.data().defaultCalendar;

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

	const response = await eventInsert(newEvent, calendarId);
	console.log(response);

	if (!firestoreGuild.exists) {
		await db.collection('discordevents').doc(newScheduledEvent.guild_id).set({
			events: [{ googleId: response.data.id, discordId: newScheduledEvent.id, calendarId, needsUpdate: true}]
		});
	} else {
		const events = firestoreGuild.data().events;
		events.push({ googleId: response.data.id, discordId: newScheduledEvent.id, calendarId, needsUpdate: true });
		await db.collection('discordevents').doc(newScheduledEvent.guildId).update({ events });
	}



}