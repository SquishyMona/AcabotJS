import { SlashCommandBuilder } from 'discord.js';
import { botUserID } from '../../index.js';

const data = new SlashCommandBuilder()
	.setName('getwebhooks')
	.setDescription('Gets webhooks for this channel')
	.addChannelOption(option =>
		option.setName('channel')
			.setDescription('The channel to get webhooks from')
			.setRequired(true));

const execute = async (interaction) => {
	const botId = await botUserID;
	await interaction.deferReply();
	const textChannel = interaction.options.getChannel('channel');
	const webhooks = await textChannel.fetchWebhooks();
	const existingWebhooks = webhooks.find(webhook => webhook.owner.id === botId);
	console.log(existingWebhooks);
	console.log(existingWebhooks.url);
	const index = existingWebhooks.findIndex(webhook => webhook.owner.id === botId);
	console.log(botId);
	console.log(index);
	console.log(existingWebhooks[index]);
	await interaction.followUp(`Webhooks in #${textChannel.name}: ${existingWebhooks}`);
}

export { data, execute };