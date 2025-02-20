import { SlashCommandBuilder } from 'discord.js';


const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List all events in the calendar');

const execute = async (interaction) => {
	await interaction.reply('List all events in the calendar');
}

export { data, execute };
