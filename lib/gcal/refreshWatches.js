import Firestore from '@google-cloud/firestore';
import { newWatch } from './newWatch.js';

export const refreshWatches = async () => {
	console.log('Refreshing calendar watches...');
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guilds = await db.collection('links').get();

	guilds.docs.forEach(async (doc) => {
		console.log(`Processing guild: ${doc.id}`);
		const guildId = doc.id;
		const guildData = doc.data();
		const calendars = guildData.calendars;
		if (!calendars) {
			console.log(`No calendars linked to guild ${guildId}`);
			return
		};
		for (const calendarId of Object.keys(calendars)) {
			console.log(`Processing calendar: ${calendarId}`);
			const calendarData = calendars[calendarId];
			if (calendarData.webhookUrl) {
				try {
					await newWatch(guildId, calendarId, guildId, calendarData.webhookUrl);
				} catch (error) {
					console.error(`Error refreshing watch for calendar ${calendarId} in guild ${guildId}:`, error);
				}
			}
		}
		console.log(`Finished processing guild: ${guildId}`);
	});
	console.log('Finished refreshing calendar watches.');
	return true;
}