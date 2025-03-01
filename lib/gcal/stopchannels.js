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

//await stopChannels('284351113984081922', '2f450ed0-bc70-4cc3-8a39-a000baa06fc4', 'pDBdzC-vZ8ZdA9w5-ocwrVhThBU');
//await stopChannels('284351113984081922', 'bfbfd6c4-632e-47d0-9b7c-2428d145f16d', 'ie7-TcCz8ayz3VcVcWi2ySRjpts');
await stopChannels('284351113984081922', 'cd45c684-922b-4eb7-af66-df97bbc72c91', '73x-xR6V9IVGikVRrGNXAU0Ez8I');
