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

client.once('ready', async () => {
    console.log(`✅ Akun F12 Aktif: ${client.user.tag}`);
    console.log(`📋 Whitelist Channel:`, allowedChannels);
    
    // SETUP TOMBOL ABADI SAAT BOT NYALA
    for (const channelId of allowedChannels) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) {
                // Cari apakah sudah pernah ada pesan tombol dari bot ini sebelumnya
                const messages = await channel.messages.fetch({ limit: 50 });
                const existingBotMessage = messages.find(m => m.author.id === client.user.id && m.content.includes("🔘 TOMBOL UTAMA CAC IMPORT 🔘"));
                
                if (!existingBotMessage) {
                    // Jika belum ada, kirim pesan baru untuk dijadikan tombol abadi
                    const msg = await channel.send("🔘 **TOMBOL UTAMA CAC IMPORT** 🔘\n\n➔ *Klik emoji di bawah untuk memicu panel /cac import secara instan!*");
                    await msg.react(TARGET_EMOJI);
                    console.log(`📢 Pesan tombol abadi baru berhasil dibuat di channel: ${channelId}`);
                } else {
                    // Jika sudah ada, pastikan emojinya tetap terpasang
                    await existingBotMessage.react(TARGET_EMOJI);
                    console.log(`🔄 Menggunakan pesan tombol abadi yang sudah ada di channel: ${channelId}`);
                }
            }
        } catch (err) {
            console.error(`⚠️ Gagal setup tombol di channel ${channelId}:`, err.message);
        }
    }
});

// FUNGSI UTAMA: Eksekutor kirim perintah /cac import ke API Discord
async function eksekusiCac(channelObj) {
    try {
        const commands = await client.getSlashCommands(channelObj.id);
        const targetCommand = commands.find(cmd => cmd.name === 'cac');

        if (targetCommand) {
            await targetCommand.send();
            console.log(`🚀 Sukses memicu popup panel /cac import!`);
        } else {
            await channelObj.send("/cac import");
            console.log(`✉️ Mengirim teks cadangan /cac import.`);
        }
    } catch (error) {
        console.error(`❌ Gagal memicu:`, error.message);
        try { await channelObj.send("/cac import"); } catch (e) {}
    }
}

// TRIGGER 1: Ketika emoji dicentang/diklik
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.id !== client.user.id) return;
    if (!allowedChannels.includes(reaction.message.channel.id)) return;

    // Pastikan yang diklik adalah pesan tombol utama kita
    if (reaction.message.content.includes("🔘 TOMBOL UTAMA CAC IMPORT 🔘") && reaction.emoji.name === TARGET_EMOJI) {
        console.log(`🎯 Tombol ditekan! Memicu panel...`);
        await eksekusiCac(reaction.message.channel);
    }
});

// TRIGGER 2: Ketika emoji diklik lagi untuk dilepas (Biar stand-by terus tanpa hilang)
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.id !== client.user.id) return;
    if (!allowedChannels.includes(reaction.message.channel.id)) return;

    if (reaction.message.content.includes("🔘 TOMBOL UTAMA CAC IMPORT 🔘") && reaction.emoji.name === TARGET_EMOJI) {
        console.log(`🎯 Tombol dilepas! Memicu ulang panel...`);
        await eksekusiCac(reaction.message.channel);
    }
});

if (!TOKEN) {
    console.error("❌ Variabel DISCORD_TOKEN kosong!");
    process.exit(1);
}

client.login(TOKEN);
