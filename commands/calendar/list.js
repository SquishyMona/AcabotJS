import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { listEvents } from '../../lib/gcal/listEvents.js';
import { listFredoniaEvents } from '../../lib/localist/listFredoniaEvents.js';
import { linkedCalendarAutocomplete } from '../../lib/autocomplete/linkedCalendarsAutocomplete.js';

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List all events in the calendar')
	.addSubcommand(subcommand =>
		subcommand.setName('fredoniaevents')
			.setDescription('List all events in the calendar')
			.addStringOption(option =>
				option.setName('type')
					.setDescription('Filter by event type. Leave blank to list all events across the music and theatre categories.')
					.setRequired(false)
					.setChoices(
						{ name: 'Music', value: '100451' },
						{ name: 'Theatre and Dance', value: '108575' },
					),
			)
			.addStringOption(option =>
				option.setName('date')
					.setDescription('Search for events on a certain date (format as YYYY-MM-DD).')
					.setRequired(false),
			)
			.addBooleanOption(option =>
				option.setName('hideresponse')
					.setDescription('If true, only you will be able to see the bots response')
					.setRequired(false),
			),
	)
	.addSubcommand(subcommand =>
		subcommand.setName('events')
			.setDescription('Get events from calendars linked to this server.')
			.addStringOption(option =>
				option.setName('calendar')
					.setDescription('The calendar to list events from')
					.setRequired(true)
					.setAutocomplete(true),
			)
			.addStringOption(option =>
				option.setName('start')
					.setDescription('The start date to list events from')
					.setRequired(false),
			)
			.addStringOption(option =>
				option.setName('end')
					.setDescription('The end date to list events from')
					.setRequired(false),
			)
			.addBooleanOption(option =>
				option.setName('hideresponse')
					.setDescription('If true, only you will be able to see the bots response')
					.setRequired(false),
			)
		);

export const autocomplete = async (interaction) => {
	await linkedCalendarAutocomplete(interaction);
}

export const execute = async (interaction) => {
	if (interaction.options.getBoolean('hideresponse')) await interaction.deferReply({ flags: MessageFlags.Ephemeral }); else await interaction.deferReply();

	if (interaction.options.getSubcommand() === 'fredoniaevents') {
		const embed = await listFredoniaEvents(interaction, interaction.options.getString('filter'), interaction.options.getString('date'));
		await interaction.followUp('Events successfully fetched from the Fredonia calendar!');
		await interaction.channel.send({ embeds: [embed] });
		return;
	} else {
		const calendarId = interaction.options.getString('calendar');
		const startDate = interaction.options.getString('start');
		const endDate = interaction.options.getString('end');
		await interaction.followUp({ content: 'Fetching events...', flags: MessageFlags.Ephemeral});
		const results = await listEvents(interaction.member.id, calendarId, startDate, endDate).catch(async (error) => {
			console.error(error);
			await interaction.followUp('There was an error fetching events. Make sure you\'ve linked your Google Account using /linkaccount, then try again.');
		});
		console.log(results);

		if (!results) {
			await interaction.followUp('No events found.');
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle('Events')
			.setColor(0x00AE86)
			.setDescription(`List of events in your calendar`);

		results.forEach((event) => {
			const timezoneOffset = (new Date().getTimezoneOffset() / 60) * (1000 * 60 * 60);
			const date = event.start.dateTime ? Math.round(new Date(event.start.dateTime).getTime() / 1000) : Math.round((new Date(new Date(event.start.date).getTime() + timezoneOffset).getTime()) / 1000);
			embed.addFields([{ name: event.summary, value: `<t:${date}:D>\nStarts: <t:${Math.round(new Date(event.start.dateTime).getTime() / 1000)}:t>\nEnds: <t:${Math.round(new Date(event.end.dateTime).getTime() / 1000)}:t>` }]);
		});
		await interaction.followUp({ content: 'Events fetched successfully!', flags: MessageFlags.Ephemeral });
		const messageOptions = { embeds: embed }
		interaction.options.getBoolean('hideresponse') ? messageOptions.flags = MessageFlags.Ephemeral : null;
		console.log(messageOptions);
		await interaction.channel.send(messageOptions);
	}
};