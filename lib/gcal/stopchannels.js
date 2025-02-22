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

// await stopChannels('284351113984081922', 'fea55cf8-4d14-429e-a2c0-3b772b7ab4dc', '73x-xR6V9IVGikVRrGNXAU0Ez8I');
await stopChannels('284351113984081922', '9dbe1de4-40f1-4a1b-a753-e1933dff3031', 'pDBdzC-vZ8ZdA9w5-ocwrVhThBU');