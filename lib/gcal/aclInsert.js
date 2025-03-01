import { google } from 'googleapis';
import { auth } from '../../events/ready.js';

export const aclInsert = async (userId, calendarId) => {
	const accessToken = await auth.getAccessToken("google", userId);
	google.options({ headers: { Authorization: `Bearer ${accessToken}` } });

	const calendar = google.calendar({ version: 'v3' });
	const data = {
		role: 'writer',
		scope: {
			type: 'user',
			value: 'public-service@acabotjs.iam.gserviceaccount.com',
		},
	};
	const result = await calendar.acl.insert({
		calendarId,
		requestBody: data,
	}).catch((error) => {
		console.error('Error inserting ACL:', error);
		throw error;
	});

	console.log('ACL inserted:', result.data);
	return result.data;
};