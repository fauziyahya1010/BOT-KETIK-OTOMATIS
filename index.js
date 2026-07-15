const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const TOKEN = process.env.DISCORD_TOKEN; 

// Mengambil daftar channel yang diizinkan dari Railway
const allowedChannels = process.env.ALLOWED_CHANNELS 
    ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim()) 
    : [];

client.once('ready', () => {
    console.log(`🤖 Bot Tombol Instan Online: ${client.user.tag}`);
    console.log(`📋 Whitelist Channel:`, allowedChannels);
});

// Listener untuk memunculkan tombol pertama kali via chat
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;

    // Ketik perintah manual ini sekali saja untuk memunculkan tombol panel di channel tersebut
    if (message.content === '!setup-cac') {
        if (!allowedChannels.includes(channelId)) {
            return message.reply("❌ **Maaf, bot tidak diizinkan di channel ini.**");
        }

        // Membuat komponen tombol
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('click_to_cac')
                    .setLabel('🚀 Kirim /cac import')
                    .setStyle(ButtonStyle.Primary) // Tombol berwarna biru blurple
            );

        await message.channel.send({
            content: "🤖 **Panel Kontrol /cac import**\nKlik tombol di bawah ini untuk mengirim perintah secara instan tanpa mengetik!",
            components: [row]
        });
    }
});

// Listener khusus untuk menangani klik tombol
client.on('interactionCreate', async (interaction) => {
    // Pastikan interaksi berasal dari komponen tombol
    if (!interaction.isButton()) return;

    const channelId = interaction.channelId;

    // Cek apakah tombol yang diklik memiliki ID 'click_to_cac'
    if (interaction.customId === 'click_to_cac') {
        // Proteksi ganda whitelist channel
        if (!allowedChannels.includes(channelId)) {
            return interaction.reply({ 
                content: "❌ Channel ini tidak diizinkan.", 
                ephemeral: true 
            });
        }

        try {
            // Karena bot resmi tidak bisa mengirim slash command milik bot lain secara teks mentah,
            // Kita akali dengan mengirim pesan teks konfirmasi publik di channel tersebut 
            // yang akan dibaca oleh bot target sebagai pemicu.
            await interaction.channel.send("/cac import");

            // Beri respon balik ke user yang klik (ephemeral: true artinya pesan hanya terlihat oleh kamu)
            await interaction.reply({
                content: "✅ Perintah `/cac import` berhasil dikirim!",
                ephemeral: true
            });

        } catch (error) {
            console.error("❌ Gagal merespons tombol:", error.message);
        }
    }
});

if (!TOKEN) {
    console.error("❌ Eror: DISCORD_TOKEN tidak ditemukan di Railway!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ Gagal login ke Discord:", err.message);
});
