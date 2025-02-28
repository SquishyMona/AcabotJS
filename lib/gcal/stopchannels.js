import { google } from 'googleapis';
import { authorize } from './auth.js';

export const stopChannels = async (userId, channelId, resourceId) => {
	const auth = await authorize(userId).catch((error) => {
		console.error('Error authorizing:', error);
		throw error;
	});

	const calendar = google.calendar({ version: 'v3', auth });
	const result = await calendar.channels.stop({
		requestBody: {
			id: channelId,
			resourceId,
		},
	}).catch((error) => {
		console.error('Error stopping channel:', error);
		throw error;
	});

	console.log('Channel stopped:', result.data);
	return result.data;
};

await stopChannels('284351113984081922', '0329f0e8-db46-4ea5-91f1-0a47c246eea2', 'pDBdzC-vZ8ZdA9w5-ocwrVhThBU');
//await stopChannels('284351113984081922', 'e129e8fb-6f17-4384-a1f4-782c6e3bfbf6', 'ie7-TcCz8ayz3VcVcWi2ySRjpts');