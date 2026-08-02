import { isOwner, isAdmin, checkCooldown, isWhitelisted, loadJson, saveJson, pickRandom, getName, formatUptime } from './lib/utils.js'
import moment from 'moment'

const startTime = Date.now()

export default async (client, msg) => {
    try {
        // Load DBs fresh every message
        const settings = loadJson('./config/settings.json')
        const content = loadJson('./config/content.json')
        let usersDB = loadJson('./data/users.json')
        let groupsDB = loadJson('./data/groups.json')
        
        const body = msg.body || ''
        const sender = msg.from.endsWith('@g.us')? msg.author : msg.from
        const senderNum = sender.replace(/[^0-9]/g, '')
        const groupId = msg.from.endsWith('@g.us')? msg.from : null
        const isGroup =!!groupId
        const chat = await msg.getChat()
        
        // No-prefix: check if first word is a command
        const args = body.trim().split(/ +/)
        const cmd = args.shift().toLowerCase()
        if (!cmd) return

        // Init user in DB
        if (!usersDB.users[sender]) {
            usersDB.users[sender] = {
                name: await getName(msg),
                xp: 0,
                level: 1,
                messages: 0,
                banned: false,
                warnings: 0,
                lastCommand: 0,
                joined: Date.now()
            }
        }
        
        const user = usersDB.users[sender]
        user.messages++
        user.xp += 1 // +1 XP per message
        
        // Ban check
        if (user.banned) return
        
        // Check if group is public or private mode
        let isPublicMode = settings.public
        if (isGroup && groupsDB.groups[groupId]) {
            isPublicMode = groupsDB.groups[groupId].public
        }
        
        // Whitelist check - only if not public mode
        if (!isPublicMode &&!isWhitelisted(cmd) &&!isOwner(senderNum)) {
            return // Silent ignore non-whitelist commands
        }
        
        // Cooldown check - 3s default
        const cooldown = checkCooldown(sender)
        if (cooldown.onCooldown &&!isOwner(senderNum)) {
            return msg.reply(`Slow down. Wait ${cooldown.timeLeft}s`)
        }
        
        user.xp += 5 // +5 XP per command
        user.level = Math.floor(user.xp / 100) + 1
        user.lastCommand = Date.now()
        
        // ===== 10 WHITELIST COMMANDS - Always work =====
        switch (cmd) {
            case 'ping':
            case 'p':
            case 'speed':
                const latency = Date.now() - msg.timestamp * 1000
                return msg.reply(`*Pong!* ${latency}ms`)
                
            case 'info':
                return msg.reply(`*WILD LIRT v1.0.0*\n*Owner:* nullforge\n*Mode:* ${isPublicMode? 'Public' : 'Private'}\n*Prefix:* None\n*Uptime:* ${formatUptime((Date.now() - startTime) / 1000)}`)
                
            case 'runtime':
                return msg.reply(`*Uptime:* ${formatUptime((Date.now() - startTime) / 1000)}`)
                
            case 'owner':
                return msg.reply(`*Owner:* wa.me/${settings.ownerNum}`)
                
            case 'donate':
                return msg.reply(`*Support the bot:*\nPayPal: paypal.me/nullforge\nBTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`)
                
            case 'help':
            case 'list':
            case 'menu':
                const menu = `*WILD LIRT MENU*\n\n` +
                `*Core* [Always On]\n` +
                `• ping, info, runtime, owner, donate\n\n` +
                `*Mode:* ${isPublicMode? 'Public - 100 Unlocked' : 'Private - 10 Whitelist'}\n` +
                `*Uptime:* ${formatUptime((Date.now() - startTime) / 1000)}\n\n` +
                `${!isPublicMode? 'Type *public on* to unlock all commands' : 'All 100 commands active'}`
                return msg.reply(menu)
        }
        
        // ===== STOP HERE IF PRIVATE MODE =====
        if (!isPublicMode &&!isOwner(senderNum)) {
            saveJson('./data/users.json', usersDB)
            return
        }
        
        // ===== 90 LOCKED COMMANDS - Only work in public mode =====
        
        // OWNER COMMANDS
        if (isOwner(senderNum)) {
            switch (cmd) {
                case 'public':
                    if (args[0] === 'on') {
                        if (isGroup) {
                            groupsDB.groups[groupId].public = true
                            saveJson('./data/groups.json', groupsDB)
                            return msg.reply('*Public mode activated for this group.* All 100 commands unlocked.')
                        } else {
                            settings.public = true
                            saveJson('./config/settings.json', settings)
                            return msg.reply('*Global public mode activated.* All commands unlocked everywhere.')
                        }
                    }
                    if (args[0] === 'off') {
                        if (isGroup) {
                            groupsDB.groups[groupId].public = false
                            saveJson('./data/groups.json', groupsDB)
                            return msg.reply('*Private mode activated.* Back to 10 whitelist commands.')
                        } else {
                            settings.public = false
                            saveJson('./config/settings.json', settings)
                            return msg.reply('*Global private mode activated.*')
                        }
                    }
                    break
                    
                case 'ban':
                    const banUser = msg.mentionedIds[0] || args[0] + '@c.us'
                    if (!usersDB.users[banUser]) return msg.reply('User not found.')
                    usersDB.users[banUser].banned = true
                    return msg.reply(`*@${banUser.split('@')[0]} banned.*`, { mentions: })
                    
                case 'unban':
                    const unbanUser = msg.mentionedIds[0] || args[0] + '@c.us'
                    if (!usersDB.users[unbanUser]) return msg.reply('User not found.')
                    usersDB.users[unbanUser].banned = false
                    return msg.reply(`*@${unbanUser.split('@')[0]} unbanned.*`, { mentions: })
            }
        }
        
        // GROUP ADMIN COMMANDS
        if (isGroup && await isAdmin(msg)) {
            switch (cmd) {
                case 'antilink':
                    groupsDB.groups[groupId].antilink = args[0] === 'on'
                    return msg.reply(`*Antilink ${args[0]}*`)
                case 'antidelete':
                    groupsDB.groups[groupId].antidelete = args[0] === 'on'
                    return msg.reply(`*Antidelete ${args[0]}*`)
                case 'welcome':
                    groupsDB.groups[groupId].welcome.enabled = args[0] === 'on'
                    return msg.reply(`*Welcome ${args[0]}*`)
            }
        }
        
        // CONTENT COMMANDS - From content.json
        switch (cmd) {
            case 'quote':
                return msg.reply(`*Quote*\n\n${pickRandom(content.quotes)}`)
            case 'joke':
                return msg.reply(`*Joke*\n\n${pickRandom(content.jokes)}`)
            case 'fact':
                return msg.reply(`*Fact*\n\n${pickRandom(content.facts)}`)
            case 'roast':
                const target = msg.mentionedIds[0]? `@${msg.mentionedIds[0].split('@')[0]}` : 'you'
                return msg.reply(`${target} ${pickRandom(content.roasts)}`, { mentions: msg.mentionedIds })
            case 'truth':
                return msg.reply(`*Truth*\n\n${pickRandom(content.truths)}`)
            case 'dare':
                return msg.reply(`*Dare*\n\n${pickRandom(content.dares)}`)
        }
        
        // USER COMMANDS
        switch (cmd) {
            case 'rank':
            case 'level':
                return msg.reply(`*Level ${user.level}*\n*XP:* ${user.xp}/100\n*Messages:* ${user.messages}`)
            case 'lb':
            case 'leaderboard':
                const top = Object.entries(usersDB.users)
                  .sort(([,a], [,b]) => b.xp - a.xp)
                  .slice(0, 5)
                  .map(([id, u], i) => `${i+1}. @${id.split('@')[0]} - Lv${u.level} [${u.xp} XP]`)
                  .join('\n')
                return msg.reply(`*Top 5*\n\n${top}`, { mentions: Object.keys(usersDB.users).slice(0,5) })
        }
        
        // Save DBs after every command
        saveJson('./data/users.json', usersDB)
        saveJson('./data/groups.json', groupsDB)
        
    } catch (e) {
        console.error(e)
        msg.reply('Error occurred.')
    }
}