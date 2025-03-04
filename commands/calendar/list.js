import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { listEvents } from '../../lib/gcal/listEvents.js';
import { listFredoniaEvents } from '../../lib/localist/listFredoniaEvents.js';

const data = new SlashCommandBuilder()
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

const autocomplete = async (interaction) => {
	await linkedCalendarAutocomplete(interaction);
}

const execute = async (interaction) => {
	if (interaction.options.getBoolean('hideresponse')) await interaction.deferReply({ flags: MessageFlags.Ephemeral }); else await interaction.deferReply();

	if (interaction.options.getSubcommand() === 'fredoniaevents') {
		await listFredoniaEvents(interaction, interaction.options.getString('filter'), interaction.options.getString('date'));
		return;
	} else {
		const calendarId = interaction.options.getString('calendar');
		const startDate = interaction.options.getString('start');
		const endDate = interaction.options.getString('end');
		await interaction.followUp({ content: 'Fetching events...', flags: MessageFlags.Ephemeral});
		const results = await listEvents(interaction.member.id, calendarId).catch(async (error) => {
			console.error(error);
			await interaction.followUp('There was an error fetching events. Make sure you\'ve linked your Google Account using /linkaccount, then try again.');
		});
		console.log(results);

		const embed = new EmbedBuilder()
			.setTitle('Events')
			.setColor(0x00AE86)
			.setDescription('List of events in your calendar');

		results.forEach((event) => {
			embed.addFields([{ name: event.summary, value: `Start: ${event.start.dateTime}\nEnd: ${event.end.dateTime}` }]);
		});
		await interaction.followUp('Events fetched successfully!');
		await interaction.channel.send({ embeds: [embed] });
	}
};

export { data, execute };
