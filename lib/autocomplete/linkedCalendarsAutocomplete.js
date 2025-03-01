import Firestore from '@google-cloud/firestore';

export const linkedCalendarAutocomplete = async (interaction) => {
	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const guild = await db.collection('links').doc(interaction.guild.id).get();
	if(!guild.exists) {
		return await interaction.respond('No calendars have been linked to this server.');
	}
	const calendars = guild.data().calendars;
	await interaction.respond(calendars.map(calendar => ({ name: calendar.calendarName, value: calendar.calendarId })));
}