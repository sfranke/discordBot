const Discord = require(`discord.js`)
const database = require(`./database`)
const apiKey = require(`./apiKey`)
const chatCommands = require(`./chatCommands`)
const logger = require(`./logger`)
const helper = require(`./helper`)
const config = helper.getConfig()
const admins = config.admins

const client = new Discord.Client({
    disableEveryone: true,
    messageCacheMaxSize: 500,
    messageCacheLifetime: 120,
    messageSweepInterval: 60,
})

// Secret login token.
const TOKEN = process.env.JERRY_TOKEN
client.login(TOKEN)

// TODO: Promisify this one please.
client.on(`ready`, async () => {
    database.createDatabase((err, res) => {
        if (err) logger.log(`debug`, err)
        logger.log(`debug`, res)
    })
})

client.on('message', message => {
    // It's good practice to ignore other bots.
    // This also makes your bot ignore itself
    if (message.author.bot) {
        return
    }

    // Check if a user is in the list of admins.
    const isAdmin = admins.some((adminId) => adminId === message.author.id )

    // Admin only commands.
    if (isAdmin) {
        chatCommands.check({ message, client })
    }

    // We are expecting a text message like:
    //`!verify XXXXXX-XXXXXX-XXXXXX-XXXXXXX-XXXXXXXXXX-XXXXXXXXX-XXXXXXXX-XXXXXXXXXXXXX`
    // The API key gets validated and the the user objectgets stored in the database
    // We remove the text message thus the API key from the text channel
    // and grant the related role.
    if (/^!verify/.test(message.content.toLowerCase())) {
        logger.log(`debug`, `Verify message received..`)
        // const chatMessage = message.content.split(' ')[1]
        if (message.content.split(' ')[1].length === 72) {
            logger.log(`debug`, `Key is 72 characters long..`)
            // The message here is supposed to come from a text based channel. We should remove the
            // message containing the API key so it can not be abused.
            apiKey.validateAccountData({message})
        }
    }
})


// Debugging logs. Note from the docs: The debug event WILL output your token,
// so exercise caution when handing over a debug log.
client.on("error", (e) => logger.log(`error`, `Client event 'error': ${e}`))
client.on("warn", (e) => logger.log(`warning`, `Client event 'warning': ${e}`))
client.on("debug", (e) => logger.log(`debug`, `Client event 'debug': ${e}`))

// TODO: Please add documentation here.
client.on('presenceUpdate', (e) => {
    // Frozen presence is the last state before the current one (the one the user just changed to).
    // When a user comes online - Recheck the current API key.
    if (e.frozenPresence.status !== `online` && e.user.presence.status) {
        // Recheck API key here
        logger.log(`debug`, `User just changed presence state`)
        apiKey.recheck({guildMember: e})
    }
})

// Emmitting events for testing.. Where 'guildMemberAdd' can be any event.
// client.emit("guildMemberAdd", message.member)
