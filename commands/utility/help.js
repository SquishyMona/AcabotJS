import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';


const data = new SlashCommandBuilder()
	.setName('help')
	.setDescription('Get help with using the bot.')
	.addSubcommandGroup(group =>
		group
			.setName('calendar')
			.setDescription('Commands related to Google Calendar')
			.addSubcommand(command =>
				command
					.setName('setup')
					.setDescription('Learn how to link a calendar to your server.'))
			.addSubcommand(command =>
				command
					.setName('linkaccount')
					.setDescription('Get help with the /linkaccount command.'))
			.addSubcommand(command =>
				command
					.setName('linkcalendar')
					.setDescription('Get help with the /linkcalendar command.'))
			.addSubcommand(command =>
				command
					.setName('unlinkcalendar')
					.setDescription('Get help with the /unlinkcalendar command.'))
			.addSubcommand(command =>
				command
					.setName('defaultcalendar')
					.setDescription('Get help with the /defaultcalendar command.')));

const execute = async (interaction) => {
	const selectedGroup = interaction.options.getSubcommandGroup();
	const selectedCommand = interaction.options.getSubcommand();
	switch (selectedGroup) {
		case 'calendar':
			switch (selectedCommand) {
				case 'setup':
					const embed = new EmbedBuilder()
						.setTitle('How to setup and link a Google Calendar with your Discord server')
						.setDescription(`With this bot, you can link one or multiple Google Calendars to this server. When linked, you'll recieve notifications to your server when events are added, changed, or removed from any linked calendar. In addition, your calendar will also sync with your Discord scheduled events, so you can see all your events in Discord and Google Calendar.`)
						.setColor('#4287f5')
						.addFields(
							{ 
								name: 'What you need', 
								value: 
								`
To use this feature, you'll need to make sure you have the following:
- A Google Account
- Your Google Calendar. You must be able to manage sharing settings for this calendar.
- The ID for your Google Calendar. You can find this under **Settings > Integrate Calendar** on the Google Calendar website.
- Manage Events and View Events permissions on Discord
								`

							},
							{ 
								name: `Before you begin`, 
								value: 
								`
Before you start, there are a few things you'll need to know:
- When linking a calendar, the bot will be added to your calendar with permissions to make changes to it. This is necessary for the bot to sync events between Discord and Google Calendar.
- If you have multiple calendars linked, one will be set as the default calendar. 
- When you create a new scheduled event in Discord, it will be added to the default calendar in Google Calendar.
  - For more information on default calendars, use the \`/help calendar defaultcalendar\` command.
- You can set a specific channel for each calendar. When you link a calendar, you can choose a channel where events from that calendar will be posted. If you don't set a channel, events will be posted to the default channel.
- You can unlink a calendar at any time using the \`/unlinkcalendar\` command.
								`
							},
							{ name: 'Step 1: Link your Google Account', value: 'Use the `/linkaccount` command to link your Google Account to the bot.' },
							{ 
								name: 'Step 2: Link a Calendar', 
								value: 
								`Use the \`/linkcalendar\` command followed by the ID of the calendar you want to link, and the channel you'd like to send notifications to.
								**Note:** If you already have a default calendar set in your server, you can use the \`setasdefault\` option to set this calendar as the new default calendar for this server. If this is the first calendar you're adding, it will automatically be set as the default calendar.`
							},
						);
					await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
					return;
				case 'linkaccount':	
					const embed2 = new EmbedBuilder()
						.setTitle('Link your Google Calendar account')
						.setDescription(`To link your Google Calendar account, use the \`/linkaccount\` command. This will allow the bot to access your Google Calendar for linking to a server.`)
						.setColor('#4287f5')
						.addFields(
							{ name: 'Note', value: `After long periods of time, you may have to reautenticate. If you're running into issues with using commands relating to Google Calendar, try using \`/linkaccount\` and log in again.` },
						);
					await interaction.reply({ embeds: [embed2], flags: MessageFlags.Ephemeral });
					return;
				case 'unlinkcalendar':
					const embed3 = new EmbedBuilder()
						.setTitle('Unlink a Google Calendar from your server')
						.setDescription(`To unlink a Google Calendar from your server, use the \`/unlinkcalendar\` command. Select the calendar you'd like to remove from the list, and the bot will remove the calendar from your server and stop syncing events from that calendar.`)
						.setColor('#4287f5')
						.addFields(
							{
								name: '\`keepexistingevents\` option',
								value:
								`When you unlink a calendar, you can choose whether or not to keep events that were synced to Discord. If you choose to keep existing events, they will remain in the server, but will not sync to Google. If you choose to delete them, they will be removed from the server.`
							},
							{ 
								name: `I can't unlink a calendar from the server!`, 
								value: 
								`Only the person who linked a certain calendar can unlink it. If you're having trouble, try contacting the person who linked the calendar and have them run the command.` 
							},
							{
								name: `What happens if I try to remove my default calendar?`, 
								value: `If you only have one calendar linked to the server, you can remove it with no problems. If you have multiple, you'll have to set a different calendar as your default before you can unlink it. Use the \`/setdefaultcalendar\` to set a new default.` 
							},
						);
					await interaction.reply({ embeds: [embed3], flags: MessageFlags.Ephemeral });
					return;
				case 'defaultcalendar':
					const embed4 = new EmbedBuilder()
						.setTitle('Default calendars')
						.setDescription(`When you have multiple calendars linked to your server, one will always be set as the default calendar. When you create a new scheduled event in Discord, it will be added to the default calendar in Google Calendar. You can change the default calendar at any time using the \`/setdefaultcalendar\` command.`)
						.setColor('#4287f5')
						.addFields(
							{
								name: 'What happens if I edit an event in Discord sent by a non-default calendar?',
								value: `Every event is linked to a specific calendar. If you edit an event in Discord that was sent by a non-default calendar, the changes will be reflected in the Google Calendar that the event was created in. If for some reason, an event in Discord is not associated with a calendar, it will be added to the default calendar.
								- **Example scenario:** Event A is created in Discord and is sent to Google Calendar A, the server's default calendar. Event B is created in Google Calendar B and is sent to Discord. If Event B is modified in Discord, the changes will be reflected in Google Calendar B. If Event A is modified in Discord, the changes will be reflected in Google Calendar A.`
							},
							{
								name: 'What happens if I try to remove my default calendar?',
								value: `If you only have one calendar linked to the server, you can remove it with no problems. If you have multiple, you'll have to set a different calendar as your default before you can unlink it.`
							},
							{
								name: `What happens when I link my first calendar to the server?`,
								value: `When you link your first calendar to the server, it will automatically be set as the default calendar. If you link other calendars afterwards, you can set them as the default using the \`/setdefaultcalendar\` command.`
							},
							{
								name: `Can I have more than one default calendar?`,
								value: `No, you can only have one default calendar. If you set a new calendar as the default, the old default will be replaced.`
							}
						);
					await interaction.reply({ embeds: [embed4], flags: MessageFlags.Ephemeral });
					return;
				case 'linkcalendar':
					const embed5 = new EmbedBuilder()
						.setTitle('Link a Google Calendar to your server')
						.setDescription(`To link a Google Calendar to your server, use the \`/linkcalendar\` command. This will allow you to choose a calendar to link to your server, as well as a channel to send notifications to.`)
						.setColor('#4287f5')
						.addFields(
							{
								name: 'Setting a calendar as default',
								value: `If you already have a default calendar set in your server, you can use the \`setasdefault\` option to set this calendar as the new default calendar for this server. If this is the first calendar you're adding, it will automatically be set as the default calendar.`
							},
							{
								name: `I'm having trouble linking my calendar!`,
								value: `If you're having trouble with the command, make sure you have the correct calendar ID. You can find this under **Settings > Integrate Calendar** on the Google Calendar website.`
							}
						);
					await interaction.reply({ embeds: [embed5], flags: MessageFlags.Ephemeral });
					return;
				default:
					break;
			}
			break;
	
		default:
			break;
	}
}

export { data, execute };