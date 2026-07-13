const { Client } = require('discord.js-selfbot-v13');
require('dotenv').config();

// Menggunakan Client khusus selfbot (tidak perlu GatewayIntents seperti bot resmi)
const client = new Client({
    checkUpdate: false
});

const TOKEN = process.env.DISCORD_TOKEN; 
const messageToSend = "/cac import"; 
const delay = 4000; // Jeda diubah ke 4 detik agar lebih aman untuk akun user

// Mengambil daftar channel yang diizinkan dari Railway
const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

// Map untuk mengelola status loop per channel
const activeChannels = new Map();

client.once('ready', () => {
    console.log(`✅ Selfbot Berhasil Online! Masuk sebagai akun: ${client.user.tag}`);
    console.log(`📋 Channel Terdaftar di Whitelist:`, allowedChannels);
});

// Fungsi pengetikan otomatis per channel
async function startAutoType(channelId) {
    const channelState = activeChannels.get(channelId);
    if (!channelState || !channelState.isRunning) return;

    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.send(messageToSend);
            console.log(`✉️ [${client.user.username}] Mengirim ke channel: ${channelId}`);
            
            if (channelState.timeoutId) clearTimeout(channelState.timeoutId);

            // Loop otomatis menggunakan timeout
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
        // Jika token tidak punya akses atau channel hilang, hapus dari memori
        if (error.message.includes('Missing Access') || error.message.includes('Unknown Channel')) {
            activeChannels.delete(channelId);
        }
    }
}

// Listener pesan masuk
client.on('messageCreate', async (message) => {
    const channelId = message.channel.id;

    // PENTING: Karena ini selfbot, perintah /cac bisa dipicu oleh akun kamu sendiri
    // Jika ingin orang lain juga bisa memicu bot kamu, hapus proteksi di bawah ini
    if (message.author.id !== client.user.id) return;

    // Aktifkan Fitur
    if (message.content === '/cac') {
        if (!allowedChannels.includes(channelId)) {
            console.log(`⚠️ Perintah /cac diabaikan karena channel ${channelId} tidak ada di whitelist Railway.`);
            return;
        }

        if (activeChannels.has(channelId) && activeChannels.get(channelId).isRunning) {
            console.log(`ℹ️ Bot sudah berjalan di channel ${channelId}`);
            return;
        }

        activeChannels.set(channelId, {
            isRunning: true,
            timeoutId: null
        });

        console.log(`🤖 Mode otomatis aktif untuk channel ${channelId}`);
        startAutoType(channelId);
    }
    
    // Matikan Fitur
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
    console.error("❌ Eror: Variabel DISCORD_TOKEN dari F12 tidak ditemukan di Railway!");
    process.exit(1);
}

// Login menggunakan token user biasa
client.login(TOKEN).catch(err => {
    console.error("❌ Login Gagal! Pastikan Token dari F12 Anda masih aktif dan belum di-logout:", err.message);
});
