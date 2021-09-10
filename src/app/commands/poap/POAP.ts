import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import StartPOAP from '../../service/poap/StartPOAP';
import ValidationError from '../../errors/ValidationError';
import EarlyTermination from '../../errors/EarlyTermination';
import EndPOAP from '../../service/poap/EndPOAP';
import DistributePOAP from '../../service/poap/DistributePOAP';
import ConfigPOAP from '../../service/poap/ConfigPOAP';

module.exports = class poap extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links',
			options: [
				{
					name: 'config',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Begin POAP event and start tracking participants.',
					options: [
						{
							name: 'role-1',
							type: CommandOptionType.ROLE,
							description: 'The role that should have access to poap commands.',
							required: false,
						},
						{
							name: 'role-2',
							type: CommandOptionType.ROLE,
							description: 'The role that should have access to poap commands.',
							required: false,
						},
						{
							name: 'role-3',
							type: CommandOptionType.ROLE,
							description: 'The role that should have access to poap commands.',
							required: false,
						},
						{
							name: 'user-1',
							type: CommandOptionType.USER,
							description: 'The user that should have access to poap commands.',
							required: false,
						},
						{
							name: 'user-2',
							type: CommandOptionType.USER,
							description: 'The user that should have access to poap commands.',
							required: false,
						},
						{
							name: 'user-3',
							type: CommandOptionType.USER,
							description: 'The user that should have access to poap commands.',
							required: false,
						},
					],
				},
				{
					name: 'start',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Begin POAP event and start tracking participants.',
					options: [
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The event name for the discussion',
							required: false,
						},
					],
				},
				{
					name: 'end',
					type: CommandOptionType.SUB_COMMAND,
					description: 'End POAP event and receive a list of participants.',
				},
				{
					name: 'distribute',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Distribute links to participants.',
				},
			],
			throttling: {
				usages: 1,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot || ctx.guildID == undefined) return 'Please try /poap within discord channel.';
		
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		
		let command: Promise<any>;
		let authorizedRoles: any[];
		let authorizedUsers: any[];
		try {
			switch (ctx.subcommands[0]) {
			case 'config':
				console.log(`/poap config ${ctx.user.username}#${ctx.user.discriminator}`);
				authorizedRoles = [ctx.options.config['role-1'], ctx.options.config['role-2'], ctx.options.config['role-3']];
				authorizedUsers = [ctx.options.config['user-1'], ctx.options.config['user-2'], ctx.options.config['user-3']];
				command = ConfigPOAP(guildMember, authorizedRoles, authorizedUsers);
				break;
			case 'start':
				console.log(`/poap start ${ctx.user.username}#${ctx.user.discriminator}`);
				command = StartPOAP(guildMember, ctx.options.start.event);
				break;
			case 'end':
				console.log(`/poap end ${ctx.user.username}#${ctx.user.discriminator}`);
				command = EndPOAP(guildMember);
				break;
			case 'distribute':
				console.log(`/poap distribute ${ctx.user.username}#${ctx.user.discriminator}`);
				command = DistributePOAP(guildMember);
				break;
			default:
				return ctx.send(`${ctx.user.mention} Please try again.`);
			}
			return this.handleCommandError(ctx, command);
		} catch (e) {
			console.error(e);
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.then(() => {
			console.log(`end /poap ${ctx.user.username}#${ctx.user.discriminator}`);
			return ctx.send(`${ctx.user.mention} DM sent!`);
		}).catch(e => {
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else if (e instanceof EarlyTermination) {
				return ctx.send(e.message);
			} else {
				console.error(e);
				return ctx.send('Sorry something is not working and our devs are looking into it.');
			}
		});
	}
};
