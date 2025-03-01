import { google } from 'googleapis';
import AuthConnect from 'authconnect-djs';
import Firestore from '@google-cloud/firestore';

export const stopChannels = async (userId, channelId, resourceId) => {
	const auth = new AuthConnect({
		google: {
			clientId: process.env.AUTH_CONNECT_CLIENTID,
			clientSecret: process.env.AUTH_CONNECT_CLIENTSECRET,
		}
	});

	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	
	if (process.env.ENVIRONMENT === 'development') auth.useDefaultDataHandlers(`${process.cwd()}/authconnect.json`);
	else auth.useFirestoreDataHandlers(db, 'auth');

	const accessToken = await auth.getAccessToken("google", userId);

	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3' });
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

//await stopChannels('284351113984081922', '14ef00fb-8057-4bbf-82f7-6082ff854f5e', 'pDBdzC-vZ8ZdA9w5-ocwrVhThBU');
//await stopChannels('284351113984081922', '14ef00fb-8057-4bbf-82f7-6082ff854f5e', 'ie7-TcCz8ayz3VcVcWi2ySRjpts');
//await stopChannels('284351113984081922', '14ef00fb-8057-4bbf-82f7-6082ff854f5e', '73x-xR6V9IVGikVRrGNXAU0Ez8I');
