import { Events } from 'discord.js';
import { incrementalSync } from '../lib/gcal/incrementalSync.js';
import { getUpcoming } from '../lib/gcal/getUpcoming.js';

export const name = Events.ClientReady;
export const once = true;
export const execute = async (client) => {
	console.log(`Ready! Logged in as ${client.user.tag}`);

	setInterval(incrementalSync, 1000 * 60 * 5);
	setInterval(async () => await getUpcoming(client), 1000 * 60);
};