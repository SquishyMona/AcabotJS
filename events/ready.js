import { Events } from 'discord.js';
import { incrementalSync } from '../lib/gcal/incrementalSync.js';

export const name = Events.ClientReady;
export const once = true;
export const execute = (client) => {
	console.log(`Ready! Logged in as ${client.user.tag}`);

	setInterval(incrementalSync, 1000 * 60 * 5);
};