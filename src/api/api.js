// TODO: Try utilizing a named export here.
const util = require('util')
const https = require('https')
const logger = require(`../../logger`)

// TODO: Add documentation, please.
/**
 *
 *
 * @param {*} { userObject }
 * @returns
 */
const checkToken = ({ userObject }) => {
    logger.log(`debug`, `Method call 'api.account' param received: ` + util.inspect(userObject))
    return new Promise((resolve, reject) => {
        if (!userObject.accountToken) {
            logger.log(`debug`, `Missing account token: ${userObject}`)
            reject(`Missing account token: ${userObject}`)
        }
        const token = userObject.accountToken
        let user = userObject
        const options = {
            hostname: 'api.guildwars2.com',
            path: '/v2/account',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + token
            }
        }

        https.get(options, (response) => {
            let chunkedData = '';
            response.on('data', (data) => {
                logger.log(`debug`, `Resonse.on data: ${data}`)
                chunkedData += data
                logger.log(`debug`, `chunkedData: ${chunkedData}`)
            })
            response.on(`end`, () => {
                logger.log(`debug`,`Event handler 'onEnd' in 'https.get'`)
                try {
                    logger.log(`debug`, `Type of chunked data right before parsing: ` + typeof chunkedData)
                    // Parse the date received here.
                    const httpsRequest = JSON.parse(chunkedData)
                    if (httpsRequest.id) {
                        const guilds = httpsRequest.guilds
                        // Add information gathered with api call to user.
                        user = {
                            accountToken: token,
                            accountId: httpsRequest.id,
                            accountName: httpsRequest.name,
                            accountGuilds: guilds,
                            accountCreated: httpsRequest.created,
                            accountWorld: httpsRequest.world.toString(),
                            accountAccess: httpsRequest.access,
                            accountCommander: httpsRequest.commander,
                        }
                    }
                    if (httpsRequest.text === 'invalid key') {
                        logger.log(`error`, `Received 'invalid key' from API!`)
                        reject(httpsRequest)
                    }
                } catch (error) {
                    logger.log(`debug`, `Event handler 'onData' in 'https.get' - Failed to parse data: ${error}`)
                    reject(error)
                }
                resolve(user)
            })
            response.on(`error`, (error) => {
                logger.log(`error`, `Error on HTTPS request to API: ${error}`)
                logger.log(`error`, `While calling \'api.guildwars.com/v2/account\' token: '${token}'`)
                // TODO: Reject here!
                reject(error)
            })
        }).on(`error`, (res) => {
            logger.log(`debug`, `HTTP request failed during API-key validation: ${res}`)
            // TODO: Reject here!
            reject(res)
        })
    })
}

export { checkToken }