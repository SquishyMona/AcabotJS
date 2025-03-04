import { Events } from 'discord.js';
import Firestore from '@google-cloud/firestore';
import { eventDelete } from '../lib/gcal/eventDelete.js';

export const name = Events.GuildScheduledEventDelete;

export const execute = async (oldScheduledEvent) => {
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const links = await db.collection('links').doc(newScheduledEvent.guildId).get();
	if (!links.exists || links.data().calendars.length === 0) {
		console.error('No calendars linked to this server');
		return;
	}
	const firestoreGuild = await db.collection('discordevents').doc(oldScheduledEvent.guildId).get();
	if (!firestoreGuild.exists) {
		console.error('Guild not found in Firestore');
		return;
	} else {
		const events = firestoreGuild.data().events;
		const eventIndex = events.indexOf(events.find((item) => item.discordId === oldScheduledEvent.id));
		if (eventIndex === -1) {
			console.error('Event not found in Firestore, skipping GCal event deletion');
			return;
		} else {
			const event = events[eventIndex];
			const response = await eventDelete(event.calendarId, event.googleId);
			console.log(response);
			events.splice(eventIndex, 1);
			await db.collection('discordevents').doc(oldScheduledEvent.guildId).update({ events });
		}
	}
}