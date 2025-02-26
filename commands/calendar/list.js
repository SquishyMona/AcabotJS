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
	);

const execute = async (interaction) => {
	if (interaction.options.getBoolean('hideresponse')) await interaction.deferReply({ flags: MessageFlags.Ephemeral }); else await interaction.deferReply();

	if (interaction.options.getSubcommand() === 'fredoniaevents') {
		await listFredoniaEvents(interaction, interaction.options.getString('filter'), interaction.options.getString('date'));
		return;
	}
	await interaction.followUp('Authorizing and fetching events...');
	const results = await listEvents(interaction.member.id).catch(async (error) => {
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
};

export { data, execute };
