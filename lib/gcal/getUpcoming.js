import { EmbedBuilder } from "discord.js"
import Firestore from "@google-cloud/firestore"

export const getUpcoming = async (client) => {
	if (new Date().getMinutes() !== 0) return;
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guilds = await db.collection('links').get();
	client.guilds.cache.forEach(async (guild) => {
		const guildData = guilds.docs.find((doc) => doc.id === guild.id);
		if (!guildData) return;
		const channelId = guildData.data().upcomingChannel;
		guild.scheduledEvents.cache.forEach(async (scheduledEvent) => {
			const now = new Date().getTime();
			const eventStart = scheduledEvent.scheduledStartAt?.getTime();
			if (eventStart && eventStart - now < 1000 * 60 * 60) {
			const channel = await guild.channels.fetch(channelId);
			const fields = [
				{ name: 'Start Time', value: `<t:${Math.round(scheduledEvent.scheduledStartTimestamp / 1000)}:t>`},
				{ name: 'End Time', value: `<t:${Math.round(scheduledEvent.scheduledEndTimestamp / 1000)}:t>`},
			]

			scheduledEvent.entityMetadata?.location ? fields.push({ name: 'Location', value: scheduledEvent.entityMetadata.location, inline: true }) : null;
			scheduledEvent.description ? fields.push({ name: 'Description', value: scheduledEvent.description, inline: true }) : null;

			const embed = new EmbedBuilder()
				.setTitle(scheduledEvent.name)
				.addFields(fields)
				.setColor('#e73ca9')
			
			await channel.send({ content: `An event is starting soon!`, embeds: [embed] });
			}
		})
	})

}