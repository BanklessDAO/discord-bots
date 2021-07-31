import { CommandContext } from 'slash-create';
import constants from '../../../constants';
import ServiceUtils from '../../../utils/ServiceUtils';
import BountyUtils from '../../../utils/BountyUtils';
import { GuildMember, Message } from 'discord.js';
import { finalizeBounty } from './validate';
import { Db, Double, Int32 } from 'mongodb';
import dbInstance from '../../../utils/db';

const BOUNTY_BOARD_URL = 'https://bankless.community';
const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

	const title = ctx.options.create.new.title;
	const summary = ctx.options.create.new.summary;
	const criteria = ctx.options.create.new.criteria;
	const reward = ctx.options.create.new.reward;
	const { rewardNumber, rewardSymbol } = await BountyUtils.validateReward(ctx, guildMember, reward);

	await BountyUtils.validateSummary(ctx, guildMember, summary);
	await BountyUtils.validateTitle(ctx, guildMember, title);
	await BountyUtils.validateCriteria(ctx, guildMember, criteria);

	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbBounty = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const newBounty = generateBountyRecord(
		summary, rewardNumber, rewardSymbol, ctx.user.username, ctx.user.id,
		title, criteria,
	);

	const dbInsertResult = await dbBounty.insertOne(newBounty);

	if (dbInsertResult == null) {
		console.error('failed to insert bounty into DB');
		return ctx.send('Sorry something is not working, our devs are looking into it.');
	}
	await dbInstance.close();

	console.log(`user ${ctx.user.username} inserted into db`);
	await ctx.send(`${ctx.user.mention} Bounty drafted! I just sent you a message.`);
	const message: Message = await guildMember.send(`<@${ctx.user.id}> Please finalize the bounty by reacting with an emoji:\n
		 👍 - bounty is ready to be posted to #🧀-bounty-board
		 📝 - let's make some additional changes to the bounty
		 ❌ - delete the bounty
		 bounty page url: ${BOUNTY_BOARD_URL}/${dbInsertResult.insertedId}`);

	return handleBountyReaction(message, ctx, guildMember, dbInsertResult.insertedId);
};

export const generateBountyRecord = (
	summary: string, rewardAmount: number, currencySymbol: string, discordHandle: string,
	discordId: string, title: string, criteria: string,
): any => {
	const currentDate = (new Date()).toISOString();
	return {
		season: new Int32(Number(process.env.DAO_CURRENT_SEASON)),
		title: title,
		description: summary,
		criteria: criteria,
		reward: {
			currency: currencySymbol,
			amount: new Double(rewardAmount),
		},
		createdBy: {
			discordHandle: discordHandle,
			discordId: discordId,
		},
		createdAt: currentDate,
		statusHistory: [
			{
				status: 'Draft',
				setAt: currentDate,
			},
		],
		status: 'Draft',
		dueAt: END_OF_SEASON,
	};
};

const handleBountyReaction = (message: Message, ctx: CommandContext, guildMember: GuildMember, bountyId: string): Promise<any> => {
	return message.awaitReactions((reaction) => {
		return ['📝', '👍', '❌'].includes(reaction.emoji.name);
	}, {
		max: 1,
		time: 60000,
		errors: ['time'],
	}).then(collected => {
		console.log('/bounty create new | handling reaction to bounty');
		const reaction = collected.first();
		if (reaction.emoji.name === '👍') {
			console.log('/bounty create new | :thumbsup: up given');
			return finalizeBounty(ctx, guildMember, bountyId);
		} else if (reaction.emoji.name === '📝') {
			console.log('/bounty create new | :pencil: given');
			return guildMember.send('Please go to website to make changes');
		} else {
			console.log('/bounty create new | delete given');
			// todo: delete bounty
		}
	}).catch(_ => {
		console.log('did not react');
	});
};