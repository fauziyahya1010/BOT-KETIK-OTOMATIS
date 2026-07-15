const { Client } = require('discord.js-selfbot-v13');
require('dotenv').config();

// === PATCH USER SETTINGS (Mencegah Error Internal Discord API) ===
try {
    const ClientUserSettingManager = require('discord.js-selfbot-v13/src/managers/ClientUserSettingManager');
    const originalPatch = ClientUserSettingManager.prototype._patch;
    ClientUserSettingManager.prototype._patch = function(data) {
        if (data && !data.friend_source_flags) {
            data.friend_source_flags = { all: false, mutual_friends: false, mutual_guilds: false };
        }
        return originalPatch.call(this, data);
    };
    console.log("✅ Patch internal berhasil diterapkan.");
} catch (e) {
    console.error("❌ Gagal menerapkan patch:", e.message);
}
// ===================================================================

const client = new Client({ 
    checkUpdate: false,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] // Mengaktifkan pembacaan reaksi pada pesan lama
});

const TOKEN = process.env.DISCORD_TOKEN;
const TARGET_EMOJI = process.env.TARGET_EMOJI || '✅'; // Menggunakan emoji centang bawaan

// Mengambil daftar channel whitelist dari Railway
const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

client.once('ready', () => {
    console.log(`✅ Akun F12 Berhasil Terhubung: ${client.user.tag}`);
    console.log(`📋 Whitelist Channel Aktif:`, allowedChannels);
    console.log(`🎯 Tombol Pemicu: Emoji ${TARGET_EMOJI}`);
});

// TRIGGER 1: Ketika emoji dicentang/diklik (Menambahkan Reaksi)
client.on('messageReactionAdd', async (reaction, user) => {
    // Memastikan HANYA KAMU yang mengklik tombol reaksi ini
    if (user.id !== client.user.id) return;

    const channelId = reaction.message.channel.id;

    // Cek keamanan channel whitelist
    if (!allowedChannels.includes(channelId)) return;

    // Cek apakah emoji yang diklik benar
    if (reaction.emoji.name === TARGET_EMOJI) {
        try {
            console.log(`🎯 Tombol emoji diklik di channel ${channelId}. Mengirim /cac import...`);
            
            // Mencari dan memicu Slash Command asli milik bot target
            const commands = await reaction.message.channel.getSlashCommands();
            const targetCommand = commands.find(cmd => cmd.name === 'cac');

            if (targetCommand) {
                await targetCommand.send();
                console.log(`🚀 Sukses memicu Slash Command asli!`);
            } else {
                // Cadangan teks biasa jika bot game target tidak merespons interaksi API
                await reaction.message.channel.send("/cac import");
                console.log(`✉️ Sukses mengirim teks biasa /cac import.`);
            }
        } catch (error) {
            console.error(`❌ Gagal mengeksekusi:`, error.message);
        }
    }
});

// TRIGGER 2: Ketika emoji diklik lagi untuk dilepas (Menghapus Reaksi)
// Ini penting agar kamu bisa klik tombol yang sama berkali-kali tanpa harus membuat pesan baru
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.id !== client.user.id) return;
    const channelId = reaction.message.channel.id;
    if (!allowedChannels.includes(channelId)) return;

    if (reaction.emoji.name === TARGET_EMOJI) {
        try {
            console.log(`🎯 Tombol emoji dilepas di channel ${channelId}. Mengirim /cac import ulang...`);
            const commands = await reaction.message.channel.getSlashCommands();
            const targetCommand = commands.find(cmd => cmd.name === 'cac');

            if (targetCommand) {
                await targetCommand.send();
            } else {
                await reaction.message.channel.send("/cac import");
            }
        } catch (error) {
            console.error(error.message);
        }
    }
});

if (!TOKEN) {
    console.error("❌ Eror: Variabel DISCORD_TOKEN F12 belum diisi di Railway!");
    process.exit(1);
}

client.login(TOKEN);
