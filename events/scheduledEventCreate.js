import { Events } from 'discord.js';
import { botUserID } from '../index.js';

export const name = Events.GuildScheduledEventCreate;

export const execute = async (newScheduledEvent) => {
	if (newScheduledEvent.creatorId === botUserID) {
		return;
	}
}