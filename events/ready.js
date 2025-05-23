import { Events } from 'discord.js';
import { incrementalSync } from '../lib/gcal/incrementalSync.js';
import { getUpcoming } from '../lib/gcal/getUpcoming.js';
import AuthConnect from 'authconnect-djs';
import Firestore from '@google-cloud/firestore';
import { deployCommands } from '../deploy-commands.js';
import { refreshWatches } from '../lib/gcal/refreshWatches.js';

export const name = Events.ClientReady;
export const once = true;

export let auth;

export const execute = async (client) => {
	console.log(`Ready! Logged in as ${client.user.tag}`);

	//const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	auth = new AuthConnect({
		google: {
			clientId: process.env.AUTH_CONNECT_CLIENTID,
			clientSecret: process.env.AUTH_CONNECT_CLIENTSECRET,
		}
	});

	auth.useDefaultDataHandlers(`${process.cwd()}/authconnect.json`);

	await deployCommands();

	incrementalSync();
	setInterval(incrementalSync, 1000 * 60 * 5);
	setInterval(async () => await getUpcoming(client), 1000 * 60);

	await refreshWatches().catch((error) => {
		console.error('Error refreshing watches:', error);
	});
	setInterval(async () => await refreshWatches(), 1000 * 60 * 60 * 24 * 7);
};