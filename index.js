const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const TOKEN = process.env.DISCORD_TOKEN; 
const messageToSend = "/cac import"; 
const delay = 3500; // Jeda aman 3.5 detik dari rate-limit

// Mengambil daftar channel yang diizinkan dari Railway (dipisahkan koma)
const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

// Map untuk mengelola status aktif dan timeout tiap channel secara terpisah
const activeChannels = new Map();

client.once('ready', () => {
    console.log(`🤖 Bot Multi-Channel Online sebagai: ${client.user.tag}`);
    console.log(`📋 Channel Terdaftar:`, allowedChannels);
});

// Fungsi pengetikan otomatis per channel
async function startAutoType(channelId) {
    const channelState = activeChannels.get(channelId);
    if (!channelState || !channelState.isRunning) return;

    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            await channel.send(messageToSend);
            console.log(`✉️ Pesan dikirim ke channel: ${channelId}`);
            
            if (channelState.timeoutId) clearTimeout(channelState.timeoutId);

            // Set loop timeout untuk channel ini
            const newTimeoutId = setTimeout(() => {
                startAutoType(channelId);
            }, delay);

            activeChannels.set(channelId, {
                isRunning: true,
                timeoutId: newTimeoutId
            });
        }
    } catch (error) {
        console.error(`❌ Gagal di channel ${channelId}:`, error.message);
        if (error.code === 50001 || error.code === 10003) {
            activeChannels.delete(channelId);
        }
    }
}

// Listener pesan masuk
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;

    // Aktifkan Fitur
    if (message.content === '/cac') {
        // Cek apakah channel ID terdaftar di whitelist
        if (!allowedChannels.includes(channelId)) {
            return message.reply("❌ **Maaf, bot tidak diizinkan berjalan di channel ini.**");
        }

        if (activeChannels.has(channelId) && activeChannels.get(channelId).isRunning) {
            return message.reply("⚠️ **Bot sudah aktif di channel ini!**");
        }

        activeChannels.set(channelId, {
            isRunning: true,
            timeoutId: null
        });

        message.reply("🤖 **Auto-typing mode AKTIF.** Mengirim '/cac import' secara berkala di channel ini.");
        startAutoType(channelId);
    }
    
    // Matikan Fitur
    if (message.content === '/stop') {
        if (!allowedChannels.includes(channelId)) return;

        const channelState = activeChannels.get(channelId);

        if (channelState) {
            if (channelState.timeoutId) clearTimeout(channelState.timeoutId);
            activeChannels.delete(channelId);
            message.reply("🛑 **Auto-typing mode NONAKTIF** di channel ini.");
        } else {
            message.reply("ℹ️ Bot sedang tidak aktif di channel ini.");
        }
    }
});

if (!TOKEN) {
    console.error("❌ Eror: Variabel DISCORD_TOKEN tidak ditemukan di Railway!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ Gagal login. Periksa token Anda:", err.message);
});
