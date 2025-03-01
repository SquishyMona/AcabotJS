import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { linkGoogleAccount } from '../../lib/gcal/auth.js';
import { auth } from '../../events/ready.js';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const data = new SlashCommandBuilder()
	.setName('linkaccount')
	.setDescription('Link your Google Calendar account');

const execute = async (interaction) => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const discordUserId = interaction.user.id;
	if (await auth.isGuildLoggedIn('google', discordUserId)) {
		return await interaction.followUp({ content: 'Your Google Calendar account is already linked.', flags: MessageFlags.Ephemeral });
	}
	interaction.followUp({ content:'Attempting to link your Google Calendar account...', flags: MessageFlags.Ephemeral});
	try {
		const authURL = await auth.generateAuthURL('google', discordUserId, SCOPES);
		await interaction.followUp({ content: 'Follow this link to complete the process: ' + authURL, flags: MessageFlags.Ephemeral });
	} catch (error) {
		console.error(error);
		await interaction.followUp({ content: 'There was an error linking your Google Calendar account.', flags: MessageFlags.Ephemeral });
	}
};

export { data, execute };