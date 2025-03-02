import { SlashCommandBuilder } from 'discord.js';
import { google } from 'googleapis';
import Firestore from '@google-cloud/firestore';
import { watchStop } from '../../lib/gcal/watchStop.js';
import { linkedCalendarAutocomplete } from '../../lib/autocomplete/linkedCalendarsAutocomplete.js';

export const data = new SlashCommandBuilder()
	.setName('unlinkcalendar')
	.setDescription('Unlink a Google Calendar from your server.')
	.addStringOption(option =>
		option.setName('calendar_id')
			.setDescription('The ID of the calendar you want to unlink')
			.setRequired(true)
			.setAutocomplete(true))
	.addBooleanOption(option =>
		option.setName('keepexistingevents')
			.setDescription('Set whether events synced to Discord should be kept or deleted from the server.')
			.setRequired(true));

export const autocomplete = async (interaction) => {
	await linkedCalendarAutocomplete(interaction);
};

export const execute = async (interaction) => {
	await interaction.deferReply();
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guild = await db.collection('links').doc(interaction.guild.id).get();
	if(!guild.exists) {
		return await interaction.followUp('No calendars have been linked to this server.');
	}
	const calendars = guild.data().calendars;
	const calendarId = interaction.options.getString('calendar_id');
	const index = calendars.indexOf(calendars.find(calendar => calendar.calendarId === calendarId));
	if (index === -1) {
		return await interaction.followUp('This calendar has not been linked to this server.');
	}
	await watchStop(interaction.user.id, calendars[index].watch.resourceId, calendars[index].watch.id).catch(async (error) => {
		console.error(error);
		await interaction.followUp('Unable to unlink calendar, only the person who linked the calendar can unlink it.');
		return;
	});

	calendars.splice(calendars.indexOf(index), 1);
	await db.collection('links').doc(interaction.guild.id).update({ calendars });
	
	const syncTokenEntry = await db.collection('synctokens').doc(interaction.guild.id).get();
	if(syncTokenEntry.exists) {
		const channels = syncTokenEntry.data().channels;
		const channel = channels.indexOf(channels.find(token => token.calendarId === calendarId));
		if(channel !== -1) {
			channels.splice(channel, 1);
			await db.collection('synctokens').doc(interaction.guild.id).update({ channels });
		}
	}

	const firestoreEvents = await db.collection('discordevents').doc(interaction.guild.id).get();
	if(firestoreEvents.exists) {
		const events = firestoreEvents.data().events;
		const eventsToDelete = [];
		const newFirestoreEvents = events;
		for (const event of events) {
			if(event.calendarId === calendarId) {
				if(!interaction.options.getBoolean('keepexistingevents')) {
					eventsToDelete.push(event.discordId);
				}
				newFirestoreEvents.splice(newFirestoreEvents.indexOf(event), 1);
			}
		}
		await db.collection('discordevents').doc(interaction.guild.id).update({ events: newFirestoreEvents });
		if (!interaction.options.getBoolean('keepexistingevents')) {
			for(const event of eventsToDelete) {
				await interaction.guild.scheduledEvents.delete(event).catch(console.error);
			}
		}
	}
	await interaction.followUp('Calendar unlinked successfully.');
}