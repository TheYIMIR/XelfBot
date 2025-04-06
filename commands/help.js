const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows a list of available commands"),
    async execute(interaction) {
        try {
            // Create categories for commands
            const categories = {
                "Moderation": {
                    description: "Moderation commands for managing your server",
                    commands: ["mod"],
                    emoji: "🛡️"
                },
                "Tickets": {
                    description: "Support ticket system commands",
                    commands: ["ticket"],
                    emoji: "🎫"
                },
                "Voice": {
                    description: "Temporary voice channel commands",
                    commands: ["voice"],
                    emoji: "🎙️"
                },
                "Statistics": {
                    description: "Server and user statistics",
                    commands: ["stats"],
                    emoji: "📊"
                },
                "Utility": {
                    description: "General utility commands",
                    commands: ["user", "help"],
                    emoji: "🔧"
                }
            };
            
            // Create the main help embed
            const helpEmbed = new EmbedBuilder()
                .setTitle("StreamBot Help")
                .setDescription("Select a category from the dropdown menu below to see available commands.")
                .setColor("#3498db")
                .addFields(
                    Object.entries(categories).map(([name, { description, emoji }]) => ({
                        name: `${emoji} ${name}`,
                        value: description,
                        inline: true
                    }))
                )
                .setFooter({ text: "StreamBot | All-in-one Discord bot" })
                .setTimestamp();
            
            // Create the category selection menu
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("help_category")
                        .setPlaceholder("Select a category")
                        .addOptions(
                            Object.entries(categories).map(([name, { description, emoji }]) => ({
                                label: name,
                                value: name.toLowerCase(),
                                description: description,
                                emoji: emoji
                            }))
                        )
                );
            
            const response = await interaction.reply({
                embeds: [helpEmbed],
                components: [row],
                ephemeral: true
            });
            
            // Create a collector to handle selection menu interactions
            const collector = response.createMessageComponentCollector({
                time: 60000 // 1 minute timeout
            });
            
            collector.on("collect", async i => {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({
                        content: "You cannot use this menu.",
                        ephemeral: true
                    });
                }
                
                const selectedCategory = i.values[0];
                
                // Create command details based on the selected category
                let commandDetails = "";
                
                if (selectedCategory === "moderation") {
                    commandDetails = "**`/mod kick`** - Kick a user from the server\n" +
                                    "**`/mod ban`** - Ban a user from the server\n" +
                                    "**`/mod timeout`** - Timeout a user\n" +
                                    "**`/mod warn`** - Warn a user\n" +
                                    "**`/mod warnings`** - View a user's warnings\n" +
                                    "**`/mod clearwarns`** - Clear a user's warnings\n" +
                                    "**`/mod setup`** - Setup moderation log channel";
                } else if (selectedCategory === "tickets") {
                    commandDetails = "**`/ticket setup`** - Set up the ticket system\n" +
                                    "**`/ticket close`** - Close a ticket\n" +
                                    "**`/ticket add`** - Add a user to a ticket\n" +
                                    "**`/ticket remove`** - Remove a user from a ticket";
                } else if (selectedCategory === "voice") {
                    commandDetails = "**`/voice setup`** - Set up the temporary voice channel system\n" +
                                    "**`/voice lock`** - Lock your voice channel\n" +
                                    "**`/voice unlock`** - Unlock your voice channel\n" +
                                    "**`/voice limit`** - Set a user limit for your voice channel\n" +
                                    "**`/voice name`** - Change the name of your voice channel\n" +
                                    "**`/voice transfer`** - Transfer ownership of your voice channel\n" +
                                    "**`/voice kick`** - Kick a user from your voice channel";
                } else if (selectedCategory === "statistics") {
                    commandDetails = "**`/stats server`** - View server statistics\n" +
                                    "**`/stats user`** - View user statistics\n" +
                                    "**`/stats messages`** - View message statistics\n" +
                                    "**`/stats voice`** - View voice channel statistics";
                } else if (selectedCategory === "utility") {
                    commandDetails = "**`/user`** - View user information\n" +
                                    "**`/help`** - Show this help menu";
                }
                
                const categoryData = Object.entries(categories).find(([name]) => name.toLowerCase() === selectedCategory)[1];
                
                // Create the category embed
                const categoryEmbed = new EmbedBuilder()
                    .setTitle(`${categoryData.emoji} ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Commands`)
                    .setDescription(categoryData.description)
                    .setColor("#3498db")
                    .addFields({ name: "Available Commands", value: commandDetails })
                    .setFooter({ text: "Use the menu below to view other categories" })
                    .setTimestamp();
                
                await i.update({
                    embeds: [categoryEmbed],
                    components: [row]
                });
            });
            
            collector.on("end", async () => {
                // Disable the selection menu after timeout
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        StringSelectMenuBuilder.from(row.components[0])
                            .setDisabled(true)
                            .setPlaceholder("Selection timed out")
                    );
                
                await interaction.editReply({
                    components: [disabledRow]
                }).catch(() => {});
            });
        } catch (error) {
            Logger.logRed(error);
            return await interaction.reply({
                content: "An error occurred while executing the command.",
                ephemeral: true
            });
        }
    }
};