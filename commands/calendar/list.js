import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { listEvents } from '../../lib/gcal/listEvents.js';


const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List all events in the calendar');

const execute = async (interaction) => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
