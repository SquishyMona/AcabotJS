import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageCreateOptions } from "discord.js";

export const createSheetComponents = async (sheetName: string, absentMembers: string[] = [], lateMembers: string[] = []) => {
	const lateButton: ButtonBuilder = new ButtonBuilder()
		.setCustomId('late')
		.setLabel('Late')
		.setStyle(ButtonStyle.Secondary);

	const absentButton: ButtonBuilder = new ButtonBuilder()
		.setCustomId('absent')
		.setLabel('Absent')
		.setStyle(ButtonStyle.Secondary);
	
	const componentRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(lateButton, absentButton);

	const embed: EmbedBuilder = new EmbedBuilder()
		.setTitle(sheetName)
		.setDescription('The following people have indicated that they will be late/absent from this event:')
		.addFields(
			{ name: 'Absent', value: 'None' },
			{ name: 'Late', value: 'None' },
		)
	
	const components: MessageCreateOptions = { embeds: [embed], components: [componentRow] };

	return components;
}