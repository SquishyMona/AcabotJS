import Firestore from '@google-cloud/firestore';
import { newWatch } from './newWatch.js';

export const refreshWatches = async () => {
	console.log('Refreshing calendar watches...');
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guilds = await db.collection('synctokens').get();

	guilds.docs.forEach(async (doc) => {
		console.log(`Processing guild: ${doc.id}`);
		const guildId = doc.id;
		const guildData = doc.data();
		const channels = guildData.channels;
		if (!channels) {
			console.log(`No calendars linked to guild ${guildId}`);
			return
		};
		for (const channel of channels) {
			console.log(`Processing calendar: ${channel.calendarId}`);
			try {
				await newWatch(guildId, channel.calendarId, guildId, guildData.webhookUrl);
			} catch (error) {
				console.error(`Error refreshing watch for calendar ${calendarId} in guild ${guildId}:`, error);
			}
		}
		console.log(`Finished processing guild: ${guildId}`);
	});
	console.log('Finished refreshing calendar watches.');
	return true;
}