import { loadJson, saveJson, getName } from '../lib/utils.js'

let groupsDB = loadJson('./data/groups.json')

export default async (client) => {
    
    // 1. GROUP JOIN - Initialize group in DB
    client.on('group_join', async (notification) => {
        const groupId = notification.chatId
        if (!groupsDB.groups[groupId]) {
            groupsDB.groups[groupId] = {
                name: notification.chat.name || 'Unknown',
                public: false,
                antilink: false,
                antidelete: false,
                antiviewonce: false,
                welcome: { enabled: false, message: 'Welcome @user to @group' },
                goodbye: { enabled: false, message: 'Goodbye @user' },
                banned: [],
                muted: [],
                added: Date.now()
            }
            saveJson('./data/groups.json', groupsDB)
        }
    })

    // 2. WELCOME & GOODBYE
    client.on('group_membership', async (notification) => {
        const groupId = notification.chatId
        const groupData = groupsDB.groups[groupId]
        if (!groupData) return

        const chat = await notification.getChat()
        const user = await notification.getContact()
        const userName = user.pushname || user.name || user.number
        const groupName = chat.name

        // Welcome
        if (notification.type === 'add' && groupData.welcome.enabled) {
            const text = groupData.welcome.message
               .replace('@user', `@${user.id.user}`)
               .replace('@group', groupName)
            await chat.sendMessage(text, { mentions: [user] })
        }

        // Goodbye
        if (notification.type === 'remove' && groupData.goodbye.enabled) {
            const text = groupData.goodbye.message
               .replace('@user', userName)
               .replace('@group', groupName)
            await chat.sendMessage(text)
        }
    })

    // 3. ANTILINK - Auto-kick if enabled
    client.on('message_create', async (msg) => {
        if (!msg.from.endsWith('@g.us')) return
        const groupId = msg.from
        const groupData = groupsDB.groups[groupId]
        if (!groupData ||!groupData.antilink) return

        const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
        if (linkRegex.test(msg.body)) {
            const chat = await msg.getChat()
            const sender = await msg.getContact()
            
            // Don't kick admins or owner
            const participant = chat.participants.find(p => p.id._serialized === sender.id._serialized)
            if (participant?.isAdmin || participant?.isSuperAdmin) return

            await msg.delete(true)
            await chat.removeParticipants([sender.id._serialized])
            await chat.sendMessage(`@${sender.id.user} removed for sending group links.`, { mentions: [sender] })
        }
    })

    // 4. ANTIDELETE - Resend deleted messages
    client.on('message_revoke_everyone', async (after, before) => {
        if (!before ||!before.from.endsWith('@g.us')) return
        const groupId = before.from
        const groupData = groupsDB.groups[groupId]
        if (!groupData ||!groupData.antidelete) return

        const sender = await before.getContact()
        const chat = await before.getChat()
        
        let text = `*Antidelete Detected*\n\n`
        text += `*User:* @${sender.id.user}\n`
        text += `*Deleted Message:*\n${before.body || '_Media deleted_'}`
        
        await chat.sendMessage(text, { mentions: [sender] })
    })

    // 5. ANTIVIEWONCE - Auto save view-once media
    client.on('message_create', async (msg) => {
        if (!msg.from.endsWith('@g.us')) return
        const groupId = msg.from
        const groupData = groupsDB.groups[groupId]
        if (!groupData ||!groupData.antiviewonce) return
        if (!msg.isViewOnce) return

        const chat = await msg.getChat()
        const media = await msg.downloadMedia()
        const sender = await msg.getContact()
        
        await chat.sendMessage(`*Antiviewonce*\nFrom: @${sender.id.user}`, { mentions: [sender] })
        await chat.sendMessage(media)
    })
}