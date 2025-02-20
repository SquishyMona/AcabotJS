import { SlashCommandBuilder } from 'discord.js';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('list')
		.setDescription('List all events in the calendar'),
	async execute(interaction) {
		await interaction.reply('List all events in the calendar');
	},
};