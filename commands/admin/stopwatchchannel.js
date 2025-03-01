import { SlashCommandBuilder } from "discord.js";
import { stopChannels } from "../../lib/gcal/stopchannels.js";

export const data = new SlashCommandBuilder()
	.setName("stopwatchchannel")
	.setDescription("Stop watching a channel for this server.")
	.addStringOption(option =>
		option.setName("channel_id")
			.setDescription("The channel_id you want to stop watching.")
			.setRequired(true)
	)
	.addStringOption(option =>
		option.setName("resource_id")
			.setDescription("The recource_id you want to stop.")
			.setRequired(true)
	);

export const execute = async (interaction) => {
	const channelId = interaction.options.getString('channel_id');
	const resourceId = interaction.options.getString('resource_id');
	await stopChannels(interaction.user.id, channelId, resourceId);
	await interaction.reply(`Stopped watching channel ${channelId}`);
}
