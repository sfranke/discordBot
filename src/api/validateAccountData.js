import { checkToken } from './api'
const database = require(`../../database`)
const logger = require(`../../logger`)
const util = require(`util`)
// Access config
const helper = require(`../../helper`)
const config = helper.getConfig()
const roleId = config.roleId

// TODO: Add documentation here.
// TODO: Please promisify.
/**
 *
 *
 * @param {*} { message }
 */
const revokeMemberRole = ({ message }) => {
    logger.log(`debug`, `Method call 'revokeMessageMemberRole' message: ${message}`)
    if(message.channel.type === 'dm') {
        // Send a basic message
        message.channel.send('Please register via the registration channel.')
        .then(message => logger.log(`info`, `Sent message: ${message.content}`))
        .catch(console.error);
    } else {
        try {
            message.member.removeRole(roleId)
                .then((resolve) => {
                    logger.log(`info`, `Removing Role: ${resolve}`)
                    message.delete()
                })
                .catch((reject) => {
                    logger.log(`debug`, `Removing Role reject: ${reject}`)
                    message.delete()
                })
        } catch (error) {
            logger.log(`debug`, `Error while trying to remove role from messageMember ${error}`)
        }
    }
}

// Validates an API key that got sent via a chat message
/**
 *
 *
 * @param {*} { message }
 */
const validateAccountData = ({ message }) => {
    logger.log(`debug`, `Method call 'apiKey.validateAccountData' message: ${message}`)
    if (message.content) {
        let chatMessage = message.content.split(' ')
        if (chatMessage[1].length === 72) {
            message.author.accountToken = chatMessage[1]
            checkToken({ userObject: message.author })
                .then((user) => {
                    user = {
                        ...user,
                        clientId: message.author.id,
                        clientNickname: message.author.username,
                    }
                    database.updateUser(user, (err, res) => {
                        // Compare user from database with user from chat. Then act upon it.
                        logger.log(`debug`, `Method call 'database.udateUser response': ` + util.inspect(res))
                        logger.log(`debug`, `Method call 'database.udateUser': ${message.author}`)
                        if (err) {
                            logger.log(`debug`, `Method call 'database.updateUser' error: ${err}`)
                            message.reply(`${err.error}`)
                            message.delete()
                            // Registration key already in use
                            if (err.error === `API-key already in use.`) {
                                // The user sending this key is already registered with said key.
                                if (res.clientId === message.author.id) {
                                    message.reply(`you are using this key!`)
                                } else {
                                    // Removing the role should also remove the `accountToken` from an account.
                                    // Soft delete or just keeping it might also be options.
                                    revokeMemberRole({ message })
                                }
                            }
                        } else {
                            message.member.addRole(roleId)
                                .then((resolve) => {
                                    logger.log(`debug`, `Method call message.member.addRole - resolve: ${resolve}`)
                                    message.delete()
                                })
                                .catch((reject) => {
                                    logger.log(`debug`, `Method call message.member.addRole - reject: ${reject}`)
                                    message.delete()
                                })
                        }
                    })
                })
                .catch((reject) => {
                    logger.log(`debug`, `Rejecting while calling 'api.account': ${reject}`)
                })
        }
    }
}

export { validateAccountData }