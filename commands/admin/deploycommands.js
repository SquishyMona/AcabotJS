import { SlashCommandBuilder } from "discord.js";
import { deployCommands } from "../../deploy-commands.js";

export const data = new SlashCommandBuilder()
	.setName('deploycommands')
	.setDescription('Deploy commands to the server.');

export const execute = async (interaction) => {
	await deployCommands();
	await interaction.reply(`Deployed commands to the server.`);
}