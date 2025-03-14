import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// and deploy your commands!
export const deployCommands = async () => {
	dotenv.config();
	const __dirname = path.resolve();

	const commands = [];
	const devcommands = []
	// Grab all the command folders from the commands directory you created earlier
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		// Grab all the command files from the commands directory you created earlier
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = await import(`file://${filePath}`);;
			if ('data' in command && 'execute' in command) {
				console.log(`Folder: ${folder} - Command: ${command.data.name}`);
				devcommands.push(command.data.toJSON());
				if (folder !== 'admin') {
					commands.push(command.data.toJSON());
				}
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	// Construct and prepare an instance of the REST module
	const rest = new REST().setToken(process.env.BOT_TOKEN);


	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.GUILD_ID),
			{ body: devcommands },
		);

        const global = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_APP_ID),
            { body: commands },
        );

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
};