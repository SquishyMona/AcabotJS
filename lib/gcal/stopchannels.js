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

//await stopChannels('284351113984081922', '29459916-4252-4652-b3ea-4addcf91c7ef', '73x-xR6V9IVGikVRrGNXAU0Ez8I');
await stopChannels('284351113984081922', '0694f300-51dd-403e-af83-c5556cd8a5de', 'ie7-TcCz8ayz3VcVcWi2ySRjpts');