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
await stopChannels('284351113984081922', 'b4425915-c1d4-4868-ac3c-fe62d1392693', 'ie7-TcCz8ayz3VcVcWi2ySRjpts');
//await stopChannels('284351113984081922', '8e8b6b4e-72d2-49d9-b029-865cf30b756b', '73x-xR6V9IVGikVRrGNXAU0Ez8I');
