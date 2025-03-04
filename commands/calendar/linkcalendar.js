import { Message, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getCalendar } from '../../lib/gcal/getCalendar.js';
import { aclInsert } from '../../lib/gcal/aclInsert.js';
import { newWatch } from '../../lib/gcal/newWatch.js';
import Firestore from '@google-cloud/firestore';
import { botUserID } from '../../index.js';
import { googleCalendarsAutocomplete } from '../../lib/autocomplete/googleCalendarsAutocomplete.js';
import { syncAllEvents } from '../../lib/gcal/syncAllEvents.js';

export const data = new SlashCommandBuilder()
	.setName('linkcalendar')
	.setDescription('Links a calendar to this server')
	.addStringOption(option =>
		option.setName('calendar_id')
			.setDescription('The ID of the calendar you want to link')
			.setRequired(true)
			.setAutocomplete(true))
	.addChannelOption(option =>
		option.setName('updates_channel')
			.setDescription('The channel to send calendar event updates to. Defaults to the current channel.')
			.setRequired(false))
	.addChannelOption(option =>
		option.setName('upcoming_channel')
			.setDescription('The channel to send upcoming calendar events to. Defaults to the same as updates_channel.')
			.setRequired(false))
	.addBooleanOption(option =>
		option.setName('setasdefault')
			.setDescription('If true, this calendar will be set as the default calendar for this server.')
			.setRequired(false));

export const autocomplete = async (interaction) => {
	const list = await googleCalendarsAutocomplete(interaction.user.id);
	await interaction.respond(list);
}

export const execute = async (interaction) => {
	const botId = await botUserID;
	await interaction.deferReply();
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guild = await db.collection('links').doc(interaction.guild.id).get();
	const sendDiscordTopGCal = guild.data().calendars.length === 0;
	if(guild.exists) {
		const calendars = guild.data().calendars;
		if(calendars.find(calendar => calendar.calendarId === interaction.options.getString('calendar_id'))) {
			return await interaction.followUp({ content: 'This calendar has already been linked to this server.', flags: MessageFlags.Ephemeral});
		}
	}
	
	const calendarId = interaction.options.getString('calendar_id');
	const calendar = await getCalendar(interaction.member.id, calendarId).catch(async (error) => {
		console.error(error);
		return null;
	});
	if (!calendar) return await interaction.followUp( { content: 'Calendar not found. You may not have access to this calendar.', flags: MessageFlags.Ephemeral });	

	await interaction.followUp({ content: 'Attempting to link your Google Calendar account...', flags: MessageFlags.Ephemeral });
	const acl = await aclInsert(interaction.member.id, calendar.id).catch(async (error) => {
		console.error(error);
		return null;
	});
	if (!acl) return await interaction.followUp({ content: 'There was an error sharing your calendar with the bot.', flags: MessageFlags.Ephemeral });

	const textChannel = interaction.options.getChannel('channel') || interaction.channel;
	console.log(textChannel);
	const existingWebhooks = await textChannel.fetchWebhooks();
	const item = existingWebhooks.find(webhook => webhook.owner.id === botId);

	console.log(item);
	let webhook = '';
	if (item === undefined) {
		webhook = await textChannel.createWebhook({ name: 'Acabot', avatar: interaction.client.user.avatarURL() });
	} else {
		webhook = item;

	}
	console.log(`New webhook in #${textChannel.name}: ${webhook}`);
	const watch = await newWatch(interaction.member.id, calendar.id, interaction.guild.id, webhook.url).catch(async (error) => {
		console.error(error);
		return null;
	});
	if (!watch) return await interaction.followUp({ content: 'There was an error setting up the watch on your calendar.', flags: MessageFlags.Ephemeral });

	if (!guild.exists) db.collection('links').doc(interaction.guild.id).set({ 
		defaultCalendar: calendar.id, 
		upcomingChannel: interaction.options.getChannel('upcoming_channel') || textChannel,
		calendars: [{ calendarId: calendar.id, calendarName: calendar.summary, watch: watch }] });
	else {
		const setAsDefault = interaction.options.getBoolean('setasdefault');
		const guildData = guild.data();
		const calendars = guildData.calendars;
		const firstCalendar = calendars.length === 0;
		calendars.push({ calendarId: calendar.id, calendarName: calendar.summary, watch: watch });
		if (setAsDefault || firstCalendar) await db.collection('links').doc(interaction.guild.id).update({ defaultCalendar: calendar.id, calendars: calendars });
		else await db.collection('links').doc(interaction.guild.id).update({ calendars });
	}
	await interaction.followUp({ content: `${calendar.summary} has been linked to this server! The bot will now attempt to syncronize all events between Google Calendar and this server's scheduled events. We'll ping you when this is finished!`, });
	await syncAllEvents(calendarId, await interaction.guild.scheduledEvents, sendDiscordTopGCal).catch(async (error) => {
		console.error(error);
		await interaction.followUp({ content: `<@${interaction.user.id}> There was an error syncing events between Google Calendar and this server. You can unlink the calendar and try again, or leave it as is. Events will be sent to Discord as they are modified on Google Calendar.`, flags: MessageFlags.Ephemeral });
		return;
	});
	await interaction.followUp({ content: `<@${interaction.user.id}> Syncronization complete!`, flags: MessageFlags.Ephemeral });
};