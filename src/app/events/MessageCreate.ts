import messageCreateOnBountyBoard from './bounty/MessageCreateOnBountyBoard';
import messageSetScoapRoles from './scoap-squad/messageSetScoapRoles';
<<<<<<< HEAD
<<<<<<< HEAD
import messageLaunchFirstQuest from './first-quest/messageLaunchFirstQuest';
import { Message } from 'discord.js';
=======
import { Message, User, GuildMember } from 'discord.js';
>>>>>>> 39f2f06 (seems to be working)
=======
import { Message } from 'discord.js';
>>>>>>> 51dbba9 (working afk)
import { DiscordEvent } from '../types/discord/DiscordEvent';
import MessageCreateOnDEGEN from './chat/MessageCreateOnDEGEN';
import ServiceUtils from '../utils/ServiceUtils';
import { LogUtils } from '../utils/Log';
import HandleAFK from './chat/HandleAFK';

export default class implements DiscordEvent {
	name = 'messageCreate';
	once = false;

	async execute(message: Message): Promise<any> {
		try {
			if (message.author.bot) return;
			// Check mentions for AFK users
			if (message.mentions.users.size > 0) {
				await HandleAFK(message).catch((e) => {
					LogUtils.logError('DEGEN failed to handle AFK', e);
				});
			}
			// DEGEN says hello
			await MessageCreateOnDEGEN(message).catch(e => {
				LogUtils.logError('DEGEN failed to say hello', e);
			});

			if (ServiceUtils.isBanklessDAO(message.guild)) {
				// Run for webhook
				await messageCreateOnBountyBoard(message).catch((e) => {
					LogUtils.logError(
						'failed to create bounty message from webhook',
						e,
					);
				});
			}
			if (message.channel.type === 'DM') {
				// Run scoap squad DM flow
				await messageSetScoapRoles(message).catch(e => {
					LogUtils.logError('failed to run scoap-squad DM flow', e);
				});

				// Run first-quest DM flow
				await messageLaunchFirstQuest(message).catch(e => {
					LogUtils.logError('failed to run first-quest DM flow', e);
				});
			}
		} catch (e) {
			LogUtils.logError('failed to process event messageCreate', e);
		}
	}
}
