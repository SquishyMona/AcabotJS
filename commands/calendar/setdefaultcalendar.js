import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { linkedCalendarAutocomplete } from "../../lib/autocomplete/linkedCalendarsAutocomplete.js";

export const data = new SlashCommandBuilder()
	.setName("setdefaultcalendar")
	.setDescription("Set the default calendar for this server.")
	.addStringOption(option =>
		option.setName("calendar")
			.setDescription("The calendar you want to set as default.")
			.setRequired(true)
			.setAutocomplete(true)
	)

export const autocomplete = async (interaction) => {
	await linkedCalendarAutocomplete(interaction);
}

export const execute = async (interaction) => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guild = await db.collection('links').doc(interaction.guild.id).get();
	if(!guild.exists) {
		return await interaction.followUp({ content: 'No calendars have been linked to this server.', flags: MessageFlags.Ephemeral });
	}
	const calendars = guild.data().calendars;
	if(calendars.length === 0) {
		return await interaction.followUp({ content: 'No calendars have been linked to this server.', flags: MessageFlags.Ephemeral });
	}
	if (calendars.length === 1) {
		return await interaction.followUp({ content: 'There is only one calendar linked to this server.', flags: MessageFlags.Ephemeral });
	}
	const calendarId = interaction.options.getString('calendar');
	const index = calendars.indexOf(calendars.find(calendar => calendar.calendarId === calendarId));
	if (index === -1) {
		return await interaction.followUp({ content: 'This calendar has not been linked to this server.', flags: MessageFlags.Ephemeral });
	}
	await db.collection('links').doc(interaction.guild.id).update({ defaultCalendar: calendarId });
	await interaction.followUp(`Default calendar set to ${calendars[index].calendarName}`);
}