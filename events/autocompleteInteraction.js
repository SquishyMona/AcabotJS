import { Events } from "discord.js";

export const name = Events.InteractionCreate;

export async function execute(interaction) {
	if (!interaction.isAutocomplete()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.autocomplete(interaction);
	} catch (error) {
		console.error(error);
	}
}