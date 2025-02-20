import { SlashCommandBuilder } from 'discord.js';
import { linkGoogleAccount } from '../../lib/gcal/sample';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('linkaccount')
		.setDescription('Link your Google Calendar account'),
	async execute(interaction) {
		const discordUserId = interaction.user.id;
		try {
			await linkGoogleAccount(discordUserId);
			await interaction.reply('Your Google Calendar account has been linked successfully!');
		} catch (error) {
			console.error(error);
			await interaction.reply('There was an error linking your Google Calendar account.');
		}
	},
};