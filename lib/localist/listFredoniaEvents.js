import { EmbedBuilder } from 'discord.js';

export const listFredoniaEvents = async (interaction, type, date) => {
	const response = await fetch(`https://events.fredonia.edu/api/2/events?type[]=${type ?? '100451&type[]=108575'}${date ? `&start=${date}` : ''}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		console.error('Error fetching events:', response.statusText);
		return false;
	}

	const data = await response.json();
	const dateObj = date ? new Date(date) : new Date();
	const displayDate = Math.round(dateObj.getTime() / 1000);
	console.log('Date:', displayDate);
	const embed = new EmbedBuilder()
		.setTitle('Events')
		.setColor(0x2e56db)
		.setDescription(`List of events in the Fredonia calendar for <t:${displayDate}:D>`);

	for (const event of data.events) {
		const start = new Date(event.event.event_instances[0].event_instance.start);
		const end = new Date(event.event.event_instances[0].event_instance.end);
		embed.addFields([{
			name: event.event.title,
			value: `
				**Starts** at <t:${start.getTime() / 1000}:t>
				**Ends** at <t:${end.getTime() / 1000}:t>
				${event.event.location ? `**Location:** ${event.event.location}\n` : ''}**${event.event.filters.event_topic[0].name} Event**
			` }]);
	}
	console.log('Events fetched:', data);
	await interaction.followUp('Events successfully fetched from the Fredonia calendar!');
	await interaction.channel.send({ embeds: [embed] });
};