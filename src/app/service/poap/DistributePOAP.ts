import { AwaitMessagesOptions, DMChannel, GuildMember, Message, MessageAttachment } from 'discord.js';
import axios from 'axios';
import POAPUtils, { POAPFileParticipant } from '../../utils/POAPUtils';
import ValidationError from '../../errors/ValidationError';
import { Db } from 'mongodb';
import constants from '../constants/constants';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import { Buffer } from 'buffer';
import MongoDbUtils from '../../utils/MongoDbUtils';
import ServiceUtils from '../../utils/ServiceUtils';

export default async (ctx: CommandContext, guildMember: GuildMember, event: string): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try ending poap event within discord channel');
		return;
	}
	Log.debug('starting poap distribution...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
	
	await ServiceUtils.tryDMUser(guildMember, 'Hi, just need a moment to stretch before I run off sending POAPS...');
	const participantsList: POAPFileParticipant[] = await askForParticipantsList(guildMember, type);
	const numberOfParticipants: number = participantsList.length;
	
	await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
	let failedPOAPsList: POAPFileParticipant[];
	if (type == 'NORMAL_DELIVERY') {
		const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(guildMember, linksMessageAttachment);
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event, listOfPOAPLinks);
	} else {
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event);
	}
	const failedPOAPsBuffer: Buffer = ServiceUtils.generateCSVStringBuffer(failedPOAPsList);
	await guildMember.send({
		embeds: [
			{
				title: 'POAPs Distribution Results',
				fields: [
					{ name: 'Attempted to Send', value: `${numberOfParticipants}`, inline: true },
					{ name: 'Successfully Sent', value: `${numberOfParticipants - failedPOAPsList.length}`, inline: true },
					{ name: 'Failed to Send', value: `${failedPOAPsList.length}`, inline: true },
				],
			},
		],
		files: [{ name: 'failed_to_send_poaps.csv', attachment: failedPOAPsBuffer }],
	});
	if (failedPOAPsList.length <= 0) {
		Log.debug('all poap successfully delivered');
		return;
	}
	await POAPUtils.setupFailedAttendeesDelivery(guildMember, failedPOAPsList, event, constants.PLATFORM_TYPE_DISCORD, ctx);
	Log.debug('poap distribution complete');
	return;
};

export const askForParticipantsList = async (guildMember: GuildMember, type: string): Promise<POAPFileParticipant[]> => {
	const message: Message = await guildMember.send({ content: 'Please upload delivery .csv file. POAPs will be distributed to these degens. Please make sure discordIds are included for each participant.' });
	const dmChannel: DMChannel = await message.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	let participantsList = [];
	try {
		const participantAttachment: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		const fileResponse = await axios.get(participantAttachment.url);
		participantsList = fileResponse.data.split('\n').map(participant => {
			const values = participant.split(',');
			if (type == 'MANUAL_DELIVERY') {
				return {
					id: values[0],
					tag: values[1],
					duration: values[2],
				};
			} else {
				return {
					discordUserId: values[0],
					discordUserTag: values[1],
					poapLink: values[2],
				};
			}
		});
		// remove first and last object
		participantsList.shift();
		participantsList.pop();
	} catch (e) {
		LogUtils.logError('failed to ask for participants list', e);
		await guildMember.send({ content: 'Invalid attachment. Please try the command again.' });
		throw new ValidationError('Please try again.');
	}
	return participantsList;
};

export const askForLinksMessageAttachment = async (guildMember: GuildMember): Promise<MessageAttachment> => {
	const sendOutPOAPReplyMessage = await guildMember.send({ content: 'Please upload links.txt file from POAP.' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	return (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
};