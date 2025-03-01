import { MessageFlags, SlashCommandBuilder } from "discord.js";
import Firestore from '@google-cloud/firestore';

export const data = new SlashCommandBuilder()
	.setName("setchannel")
	.setDescription("Set the channel for calendar event updates and upcoming event notifications")
	.addSubcommand(subcommand =>
		subcommand.setName("upcoming")
			.setDescription("Set the channel for upcoming event notifications")
			.addChannelOption(option =>
				option.setName("channel")
					.setDescription("The channel you want to set for updates")
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand.setName("updates")
			.setDescription("Set the channel for calendar event updates")
			.addChannelOption(option =>
				option.setName("channel")
					.setDescription("The channel you want to set for updates")
					.setRequired(true)
			)
	);

export const execute = async (interaction) => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const channel = interaction.options.getChannel("channel");
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });

	if (interaction.options.getSubcommand() === "upcoming") {
		const guild = await db.collection('links').doc(interaction.guild.id).get();
		if(!guild.exists) {
			return await interaction.followUp({ content: 'No calendars have been linked to this server.', flags: MessageFlags.Ephemeral });
		}
		await db.collection('links').doc(interaction.guild.id).update({ upcomingChannel: channel.id });
		await interaction.followUp(`Upcoming event notifications will be sent to ${channel}`);
	} else {
		const guild = await db.collection('synctokens').doc(interaction.guild.id).get();
		if(!guild.exists) {
			return await interaction.followUp({ content: 'No calendars have been linked to this server.', flags: MessageFlags.Ephemeral });
		}
		const oldWebhookId = guild.data().webhookUrl.split('/')[5]
		const webhooks = await interaction.guild.fetchWebhooks();
		const newWebhook = await channel.createWebhook({ name: 'Acabot', avatar: interaction.client.user.avatarURL() });
		await db.collection('synctokens').doc(interaction.guild.id).update({ webhookUrl: newWebhook.url });
		await webhooks.find(webhook => webhook.id === oldWebhookId).delete();
		await interaction.followUp(`Calendar event updates will be sent to ${channel}`);
	}
}