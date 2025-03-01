export const incrementalSync = async () => {
	const request = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Resource-State': 'incremental-sync',
		}
	};

	const response = await fetch('https://acabot-webhook-396114486132.us-central1.run.app', request);

	if (!response.ok) {
		console.error('Error syncing calendars:', response.statusText);
		return false;
	}

	console.log('Calendars synced:', response.statusText);
};