import { authorize } from './auth.js';
import { google } from 'googleapis';

export const aclInsert = async (userId, calendarId) => {
	const auth = await authorize(userId).catch((error) => {
		console.error('Error authorizing:', error);
		throw error;
	});

	const calendar = google.calendar({ version: 'v3', auth });
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