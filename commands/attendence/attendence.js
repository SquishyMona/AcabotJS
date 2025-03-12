import { ComponentType, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { createSheetComponents } from "../../lib/attendence/createSheetComponents.js";
import Firestore from "@google-cloud/firestore";

export const data = new SlashCommandBuilder()
	.setName("attendence")
	.setDescription("Create and manage attendence sheets.")
	.addSubcommand(subcommand => 
		subcommand.setName("createsheet")
			.setDescription("Create a new one-time attendence sheet.")
			.addStringOption(option =>
				option.setName("sheet_name")
					.setDescription("The name of the sheet.")
					.setRequired(true)
			)
			.addStringOption(option =>
				option.setName("send_time")
					.setDescription("The time that this sheet should be sent")
					.setRequired(true)
			)
			.addStringOption(option =>
				option.setName("event_start_time")
					.setDescription("The time that the event starts. This will be displayed on the sheet.")
					.setRequired(true)
			)
	);

export const execute = async (interaction) => {
	await interaction.reply({ content: `This command isn't working just yet; stay tuned for more information!`, flags: MessageFlags.Ephemeral });
	return;
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const sheetName = interaction.options.getString('sheet_name');
	const sendTime = interaction.options.getString('send_time');
	const eventStartTime = interaction.options.getString('event_start_time');
	await interaction.followUp({ content: `Creating sheet ${sheetName} to be sent at ${sendTime}`, flags: MessageFlags.Ephemeral });

	const sheetComponents = createSheetComponents(sheetName);

	const newAttendenceSheet = await interaction.channel.send(sheetComponents);

	const collector = newAttendenceSheet.createMessageComponentCollector({ componentType: ComponentType.Button, time: 1000 * 60 * 60 * 24 })

	const db = new Firestore.Firestore({ projectId: 'acabotjs', keyFilename: `${process.cwd()}/cloud/serviceaccount.json` });
	const firestoreAttendenceRef = db.collection('attendence').doc(newAttendenceSheet.id);
	await firestoreAttendenceRef.set({
		sheetName: sheetName,
		sendTime: sendTime,
		eventStartTime: eventStartTime,
		late: [],
		absent: []
	});


	collector.on('collect', async buttonInteraction => {
		if(buttonInteraction.customId === 'late') {
			await firestoreAttendenceRef.update({
				late: Firestore.FieldValue.arrayUnion(button.user.id)
			})
		} else {
			await firestoreAttendenceRef.update({
				absent: Firestore.FieldValue.arrayUnion(button.user.id)
			})
		}
		const newData = await firestoreAttendenceRef.get();
		const late = newData.data().late;
		const absent = newData.data().absent;
		const embed = newAttendenceSheet.embeds[0];
		const editedEmbed = EmbedBuilder.from(embed).setFields(
			{ name: 'Late', value: late.join('\n') },
			{ name: 'Absent', value: absent.join('\n') }
		)
	})

	await interaction.followUp({ content: 'Your attendence embed has been sent!', flags: MessageFlags.Ephemeral})
}