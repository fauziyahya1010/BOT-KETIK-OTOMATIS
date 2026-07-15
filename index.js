const { Client } = require('discord.js-selfbot-v13');
const express = require('express');
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

const client = new Client({ checkUpdate: false });
const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.DISCORD_TOKEN;

// Mengambil daftar channel yang diizinkan dari Railway
const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

client.once('ready', () => {
    console.log(`✅ Akun F12 Online: ${client.user.tag}`);
    console.log(`📋 Channel Terdaftar:`, allowedChannels);
});

// Endpoint dinamis menggunakan ID Channel (:channelId)
app.get('/kirim-cac/:channelId', async (req, res) => {
    const targetChannel = req.params.channelId;

    // Cek Keamanan: Apakah channel ID ini terdaftar di whitelist Railway?
    if (!allowedChannels.includes(targetChannel)) {
        return res.status(403).send("❌ Gagal: ID Channel ini tidak terdaftar di whitelist Railway kamu!");
    }

    try {
        const channel = await client.channels.fetch(targetChannel);
        if (channel) {
            // Memicu Slash Command asli milik bot target di channel tersebut
            const commands = await channel.getSlashCommands();
            const targetCommand = commands.find(cmd => cmd.name === 'cac');

            if (targetCommand) {
                await targetCommand.send();
                return res.send(`🚀 Sukses! Akunmu berhasil memicu /cac import di channel: ${targetChannel}`);
            } else {
                // Cadangan jika slash command bot target sedang tidak merespons
                await channel.send("/cac import");
                return res.send(`✉️ Sukses mengirim teks biasa ke channel: ${targetChannel}`);
            }
        }
    } catch (error) {
        return res.status(500).send(`❌ Eror: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Web Trigger Multi-Channel aktif di port ${PORT}`);
});

if (!TOKEN) {
    console.error("❌ Eror: DISCORD_TOKEN F12 belum diisi di Railway!");
    process.exit(1);
}

client.login(TOKEN);
