import { SlashCommandBuilder } from 'discord.js';
module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Register a calendar for your server to use')
		.addStringOption(option =>
			option.setName('name')
				.setDescription('The name of the event')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('date')
				.setDescription('The date of the event')
				.setRequired(true)),
};