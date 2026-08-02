import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import handler from './handler.js'
import events from './core/events.js'

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session' // Saves login so no QR every restart
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
})

// QR Code for first login
client.on('qr', (qr) => {
    console.log('[QR] Scan this QR code with WhatsApp:')
    qrcode.generate(qr, { small: true })
})

// Bot ready
client.on('ready', () => {
    console.log('[WILD LIRT] Bot is ready!')
    console.log('[MODE] Private - Whitelist active')
    console.log('[PREFIX] None')
})

// Load event handlers - welcome, antilink, antidelete
events(client)

// Load command handler - all 100 commands
client.on('message_create', async (msg) => {
    // Ignore status updates + bot's own messages
    if (msg.from === 'status@broadcast' || msg.fromMe) return
    await handler(client, msg)
})

// Error handling
client.on('auth_failure', (msg) => {
    console.error('[AUTH] Login failed:', msg)
})

client.on('disconnected', (reason) => {
    console.log('[DISCONNECT] Bot disconnected:', reason)
    client.initialize() // Auto-reconnect
})

// Start bot
client.initialize()

console.log('[INIT] Starting WILD LIRT v1.0.0...')