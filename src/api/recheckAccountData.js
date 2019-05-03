import { checkToken } from './api'
const database = require(`../../database`)
const logger = require(`../../logger`)
const util = require(`util`)
const helper = require(`../../helper`)
const config = helper.getConfig()
const roleId = config.roleId

// TODO: Add documentation here.
// TODO: Please promisify.
/**
 *
 *
 * @param {*} { guildMember }
 */
const revokeGuildMemberAccess = ({ guildMember }) => {
    logger.log(`debug`, `guildMember: ${guildMember}`)
    try {
        guildMember.removeRole(roleId)
            .then((resolve) => {
                logger.log(`info`, `Invalid accountToken - removing Role: ${resolve}`)
            })
            .catch((reject) => {
                logger.log(`debug`, `Invalid accountToken - removing Role reject: ${reject}`)
            })
    } catch (error) {
        logger.log(`debug`, `Error while trying to remove role from guildMember: ${error}`)
    }
}

// TODO: Add documentation here.
// TODO: Please promisify.
/**
 *
 *
 * @param {*} { guildMember }
 */
const recheckAccountData = ({ guildMember }) => {
    // Rechecking API key on reconnect
    // logger.log(`debug`, `GuildMember: ` + util.inspect(guildMember, { showHidden: true, depth: null }));
    guildMember.roles.forEach((role) => {
	    console.log("TCL: apiKey.recheck -> role", `\x1b[96m${role.name}\x1b[0m`)
    });
    database.getClientByUid(guildMember.user.id, (err, doc) => {
        logger.log(`debug`, `Method call 'getClientByUid' error: ` + util.inspect(err))
        logger.log(`debug`, `Method call 'getClientByUid' doc: ` + util.inspect(doc))
        if (doc) {
            // Recognized user, we have an entry.. recheck here!
            if (doc.accountToken) {
                // IF we have a Token please recheck against the official API.
                // TODO: 3(three) cases here.
                // 1. Key is vaild - update current data.
                // 2. Invalid API key - Remove from database (soft delete?)
                // API not reachable.. keep current data and ignore for now? Error handling needs to be
                // defined here!!!
                logger.log(`debug`, `Found account token: ${doc.accountToken}`)
                checkToken({ userObject: doc })
                    .then((user) => {
                        logger.log(`debug`, `Resolving 'api.account' for user: ${user.accountName} - ${user.accountId}`)
                        // If we have a response we can assume there is an account attached to the key. If our
                        // database user and the game user have the same id this qualifies as a match.
                        if (user && user.accountId === doc.accountId) {
							console.log("\x1b[96mTCL: apiKey.recheck -> user.accountId\x1b[0m", user.accountId)
                            // Update account data here! Any of the game account related data might have changed
                            // so let's update it here.
                            // Response should at least match the accountId from the database, otherwise DO NOT update
                            database.updateUser(user, (err, res) => {
                                // Here the `err` will also callback because the API key is actually in use by the
                                // current user we are checking here.
                                logger.log(`debug`, `Method call 'database.updateUser' error: ` + util.inspect(err))
                                logger.log(`debug`, `Method call 'database.updateUser' res: ` + util.inspect(res))
                                // Make sure to grant role accordingly.
                                // Do we need additional checks here? What are the pre-requirements for a user to get
                                // access to our role(s)?
                                guildMember.addRole(roleId);
                            });
                        }
                    })
                    .catch((reject) => {
                        logger.log(`debug`, `Rejecting 'api.account': ${reject}`)
                        // TODO: (2.) This is the invalid key case mentioned above.
                        if (reject.text == 'invalid key') {
                            logger.log(`debug`, `Invalid key! Revoking member access now.`)
                            // Revoke access here!
                            revokeGuildMemberAccess({ guildMember })
                        }
                    })
            }
            // Make sure to remove the role if the user has no accountToken.
            if (!doc.accountToken) {
                logger.log(`debug`, `User with invalid accountToken: ${doc.accountToken}`)
                // Revoke access here!
                revokeGuildMemberAccess({ guildMember })
            }
        }
        if (err === null && doc === null) {
            logger.log(`debug`, `User without data - revoking Role: ${guildMember}`)
            // Make sure to remove guild roles if they are present
            revokeGuildMemberAccess({ guildMember })
            // TODO: Send a new intive to the user.
        }
    });
}

export { recheckAccountData }
