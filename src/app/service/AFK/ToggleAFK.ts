import { GuildMember } from 'discord.js';
import ValidationError from '../../errors/ValidationError';
import ServiceUtils from '../../utils/ServiceUtils';
import Log from '../../utils/Log';

export default async (guildMember: GuildMember): Promise<any> => {
	if (guildMember.user.id === null) {
		throw new ValidationError(`No guildMember <@${guildMember.id}>.`);
	}
	try {
		const AFKRole = ServiceUtils.getRoleId(guildMember.guild.roles, 'AFK');
		// change role ID
		const isAFK = ServiceUtils.hasRole(guildMember, AFKRole.id);
		if (!isAFK) {
			await guildMember.roles.add(AFKRole);
			Log.info(`user ${guildMember.user.tag} given ${AFKRole.name} role`);
			return true;
		} else {
			await guildMember.roles.remove(AFKRole);
			Log.info(`user ${guildMember.user.tag} removed ${AFKRole.name} role`);
			return false;
		}
	} catch (e) {
		Log.error(`toggleAFKRoll error: ${e}`);
	}
};

