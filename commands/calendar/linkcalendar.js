import { SlashCommandBuilder } from 'discord.js';
import { getCalendar } from '../../lib/gcal/getCalendar.js';
import { aclInsert } from '../../lib/gcal/aclInsert.js';
import { promises as fs } from 'fs';
import { newWatch } from '../../lib/gcal/newWatch.js';

export const data = new SlashCommandBuilder()
	.setName('linkcalendar')
	.setDescription('Links a calendar to this server')
	.addStringOption(option =>
		option.setName('calendar_id')
			.setDescription('The ID of the calendar you want to link')
			.setRequired(true));

export const execute = async (interaction) => {
	await interaction.deferReply();
	const calendarId = interaction.options.getString('calendar_id');
	const linkFile = await fs.readFile(`${process.cwd()}/lib/gcal/links.json`, 'utf8');
	const links = await JSON.parse(linkFile);
	if (links.some(link => link.serverId === interaction.guild.id && link.calendarId === calendarId)) return await interaction.followUp('This server is already linked to this calendar.');

	const calendar = await getCalendar(interaction.member.id, calendarId).catch(async (error) => {
		console.error(error);
		return null;
	});
	if (!calendar) return await interaction.followUp('Calendar not found. You may not have access to this calendar.');

	await interaction.followUp('Attempting to link your Google Calendar account...');
	const acl = await aclInsert(interaction.member.id, calendar.id).catch(async (error) => {
		console.error(error);
		return null;
	});
	if (!acl) return await interaction.followUp('There was an error sharing your calendar with the bot.');


	const watch = await newWatch(interaction.member.id, calendar.id).catch(async (error) => {
		console.error(error);
		return null;
	});
	if (!watch) return await interaction.followUp('There was an error setting up the watch on your calendar.');

	links.push({ serverId: interaction.guild.id, calendarId: calendar.id, watch: watch });
	await fs.writeFile(`${process.cwd()}/lib/gcal/links.json`, JSON.stringify(links, null, '\t'));
	await interaction.followUp(`${calendar.summary} has been linked to this server!`);
};