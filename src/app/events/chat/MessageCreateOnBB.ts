import { Message } from 'discord.js';

const MessageCreateOnBB = async (message: Message): Promise<any> => {
	const greetings = ['Hello', 'Howdy', 'Hey', 'Go Bankless,', 'Nice to meet you,', 'It\'s great to see you,', 'Ahoy,'];
	if (message.content.toLowerCase().match('^.*bounty board[!.?]$')) {
		message.channel.send({ content: `${greetings[Math.floor(Math.random() * greetings.length)]} ${message.author.username}!` });
	}
	return;
};

export default MessageCreateOnBB;