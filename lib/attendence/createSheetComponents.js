import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export const createSheetComponents = async (sheetName, absentMembers = [], lateMembers = []) => {
	const lateButton = new ButtonBuilder()
		.setCustomId('late')
		.setLabel('Late')
		.setStyle(ButtonStyle.Secondary);

	const absentButton = new ButtonBuilder()
		.setCustomId('absent')
		.setLabel('Absent')
		.setStyle(ButtonStyle.Secondary);
	
	const componentRow= new ActionRowBuilder().addComponents(lateButton, absentButton);

	const embed = new EmbedBuilder()
		.setTitle(sheetName)
		.setDescription('The following people have indicated that they will be late/absent from this event:')
		.addFields(
			{ name: 'Absent', value: 'None' },
			{ name: 'Late', value: 'None' },
		)
	
	const components = { embeds: [embed], components: [componentRow] };

	return components;
}