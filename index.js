const { Client } = require('discord.js-selfbot-v13');
require('dotenv').config();

// === PATCH USER SETTINGS (Anti-Crash) ===
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
    console.error(e.message);
}
// ========================================

const client = new Client({ 
    checkUpdate: false,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

const TOKEN = process.env.DISCORD_TOKEN;
const TARGET_EMOJI = process.env.TARGET_EMOJI || '✅'; 

const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

client.once('ready', () => {
    console.log(`✅ Akun F12 Aktif: ${client.user.tag}`);
    console.log(`📋 Whitelist Channel:`, allowedChannels);
    console.log(`🎯 Tombol Pemicu: Emoji ${TARGET_EMOJI}`);
});

// Otomatis menempelkan emoji ke setiap ada pesan baru dari orang/bot lain
client.on('messageCreate', async (message) => {
    const channelId = message.channel.id;
    if (!allowedChannels.includes(channelId)) return;
    if (message.author.id === client.user.id) return;

    try {
        await message.react(TARGET_EMOJI);
        console.log(`➕ Otomatis menempelkan tombol emoji ke pesan baru.`);
    } catch (error) {
        console.error(`❌ Gagal menempelkan emoji otomatis:`, error.message);
    }
});

// FUNGSI UTAMA: Eksekutor kirim perintah /cac import
async function eksekusiCac(channelObj) {
    try {
        // Cara yang benar untuk mengambil slash command di selfbot-v13:
        // Kita panggil getSlashCommands langsung dari client dengan parameter ID channel
        const commands = await client.getSlashCommands(channelObj.id);
        const targetCommand = commands.find(cmd => cmd.name === 'cac');

        if (targetCommand) {
            // Jalankan perintah /cac import asli bawaan bot game
            await targetCommand.send();
            console.log(`🚀 Sukses memicu Slash Command asli via klik emoji!`);
        } else {
            // Cadangan teks biasa jika bot target tidak merespons API
            await channelObj.send("/cac import");
            console.log(`✉️ Perintah /cac tak deteksi, mengirim teks biasa sebagai cadangan.`);
        }
    } catch (error) {
        console.error(`❌ Gagal mengeksekusi perintah:`, error.message);
        // Upayakan kirim teks biasa jika pencarian command eror kembali
        try {
            await channelObj.send("/cac import");
        } catch (err) {
            console.error(`❌ Benar-benar gagal kirim pesan:`, err.message);
        }
    }
}

// TRIGGER 1: Ketika emoji dicentang/diklik oleh kamu
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.id !== client.user.id) return;
    const channelId = reaction.message.channel.id;
    if (!allowedChannels.includes(channelId)) return;

    if (reaction.emoji.name === TARGET_EMOJI) {
        console.log(`🎯 Tombol diklik! Memproses pengiriman ke channel: ${channelId}`);
        await eksekusiCac(reaction.message.channel);
    }
});

// TRIGGER 2: Ketika emoji diklik lagi untuk dilepas (Biar bisa klik berkali-kali)
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.id !== client.user.id) return;
    const channelId = reaction.message.channel.id;
    if (!allowedChannels.includes(channelId)) return;

    if (reaction.emoji.name === TARGET_EMOJI) {
        console.log(`🎯 Tombol dilepas! Memproses pengiriman ulang ke channel: ${channelId}`);
        await eksekusiCac(reaction.message.channel);
    }
});

if (!TOKEN) {
    console.error("❌ Variabel DISCORD_TOKEN kosong!");
    process.exit(1);
}

client.login(TOKEN);
