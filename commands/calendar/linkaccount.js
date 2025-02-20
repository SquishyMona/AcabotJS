import { SlashCommandBuilder } from 'discord.js';
import { linkGoogleAccount } from '../../lib/gcal/auth.js';

const data = new SlashCommandBuilder()
	.setName('linkaccount')
	.setDescription('Link your Google Calendar account');

const execute = async (interaction) => {
	await interaction.deferReply();
	interaction.followUp('Attempting to link your Google Calendar account...');
	const discordUserId = interaction.user.id;
	try {
		await linkGoogleAccount(discordUserId);
		await interaction.followUp('Your Google Calendar account has been linked successfully!');
	} catch (error) {
		console.error(error);
		await interaction.followUp('There was an error linking your Google Calendar account.');
	}
};

export { data, execute };