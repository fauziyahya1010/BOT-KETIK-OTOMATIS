const { Client } = require('discord.js-selfbot-v13');
require('dotenv').config();

// === PATCH UNTUK MEMPERBAIKI EROR TYPERROR (friend_source_flags) ===
try {
    const ClientUserSettingManager = require('discord.js-selfbot-v13/src/managers/ClientUserSettingManager');
    const originalPatch = ClientUserSettingManager.prototype._patch;
    
    ClientUserSettingManager.prototype._patch = function(data) {
        // Jika data friend_source_flags null atau tidak ada, buatkan objek kosong agar tidak error .all
        if (data && !data.friend_source_flags) {
            data.friend_source_flags = { all: false, mutual_friends: false, mutual_guilds: false };
        }
        return originalPatch.call(this, data);
    };
    console.log("✅ Patch untuk friend_source_flags berhasil diterapkan.");
} catch (e) {
    console.error("❌ Gagal menerapkan patch internal:", e.message);
}
// ===================================================================

const client = new Client({
    checkUpdate: false
});

const TOKEN = process.env.DISCORD_TOKEN; 
const messageToSend = "/cac import"; 
const delay = 4000; // 4 detik aman untuk selfbot

const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

const activeChannels = new Map();

client.once('ready', () => {
    console.log(`✅ Selfbot Berhasil Online! Akun: ${client.user.tag}`);
    console.log(`📋 Whitelist Channel:`, allowedChannels);
});

async function startAutoType(channelId) {
    const channelState = activeChannels.get(channelId);
    if (!channelState || !channelState.isRunning) return;

    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.send(messageToSend);
            console.log(`✉️ [${client.user.username}] Mengirim ke: ${channelId}`);
            
            if (channelState.timeoutId) clearTimeout(channelState.timeoutId);

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
        if (error.message.includes('Missing Access') || error.message.includes('Unknown Channel')) {
            activeChannels.delete(channelId);
        }
    }
}

client.on('messageCreate', async (message) => {
    const channelId = message.channel.id;

    // Hanya merespons jika Anda sendiri yang mengetik /cac atau /stop
    if (message.author.id !== client.user.id) return;

    if (message.content === '/cac') {
        if (!allowedChannels.includes(channelId)) {
            console.log(`⚠️ Channel ${channelId} tidak ada di whitelist Railway.`);
            return;
        }

        if (activeChannels.has(channelId) && activeChannels.get(channelId).isRunning) {
            return;
        }

        activeChannels.set(channelId, {
            isRunning: true,
            timeoutId: null
        });

        console.log(`🤖 Mode otomatis aktif untuk channel ${channelId}`);
        startAutoType(channelId);
    }
    
    if (message.content === '/stop') {
        if (!allowedChannels.includes(channelId)) return;

        const channelState = activeChannels.get(channelId);
        if (channelState) {
            if (channelState.timeoutId) clearTimeout(channelState.timeoutId);
            activeChannels.delete(channelId);
            console.log(`🛑 Mode otomatis berhenti untuk channel ${channelId}`);
        }
    }
});

if (!TOKEN) {
    console.error("❌ Eror: Variabel DISCORD_TOKEN tidak ditemukan di Railway!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ Login Gagal:", err.message);
});
