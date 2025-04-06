const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ConfigManager = require("../internal/ConfigManager");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mod")
        .setDescription("Moderation commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName("kick")
                .setDescription("Kick a user from the server")
                .addUserOption(option => option.setName("target").setDescription("The user to kick").setRequired(true))
                .addStringOption(option => option.setName("reason").setDescription("Reason for kicking")))
        .addSubcommand(subcommand =>
            subcommand
                .setName("ban")
                .setDescription("Ban a user from the server")
                .addUserOption(option => option.setName("target").setDescription("The user to ban").setRequired(true))
                .addStringOption(option => option.setName("reason").setDescription("Reason for banning"))
                .addIntegerOption(option => option.setName("days").setDescription("Delete messages from the past days").setMinValue(0).setMaxValue(7)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("timeout")
                .setDescription("Timeout a user")
                .addUserOption(option => option.setName("target").setDescription("The user to timeout").setRequired(true))
                .addIntegerOption(option => option.setName("duration").setDescription("Timeout duration in minutes").setRequired(true))
                .addStringOption(option => option.setName("reason").setDescription("Reason for timeout")))
        .addSubcommand(subcommand =>
            subcommand
                .setName("warn")
                .setDescription("Warn a user")
                .addUserOption(option => option.setName("target").setDescription("The user to warn").setRequired(true))
                .addStringOption(option => option.setName("reason").setDescription("Reason for warning").setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("warnings")
                .setDescription("View warnings for a user")
                .addUserOption(option => option.setName("target").setDescription("The user to check warnings for").setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("clearwarns")
                .setDescription("Clear warnings for a user")
                .addUserOption(option => option.setName("target").setDescription("The user to clear warnings for").setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Setup moderation settings")
                .addChannelOption(option => option.setName("log_channel").setDescription("Channel to log moderation actions").setRequired(true))),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            
            // Get or create moderation config
            let modConfig = config.getGuildConfig(guildId, "moderation");
            
            const target = interaction.options.getUser("target");
            const member = interaction.options.getMember("target");
            
            // For setup command
            if (subcommand === "setup") {
                // Check for admin permissions
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return await interaction.reply({ content: "You need administrator permissions to use this command.", ephemeral: true });
                }
                
                const logChannel = interaction.options.getChannel("log_channel");
                
                // Save moderation configuration
                modConfig.logChannel = logChannel.id;
                config.saveGuildConfig(guildId, "moderation", modConfig);
                
                return await interaction.reply({ content: `Moderation log channel set to ${logChannel}`, ephemeral: true });
            }
            
            if (!member && subcommand !== "ban") {
                return await interaction.reply({ content: "User is not in this server.", ephemeral: true });
            }
            
            const logEmbed = new EmbedBuilder()
                .setTimestamp()
                .setFooter({ text: `Moderator: ${interaction.user.tag}` });
            
            switch (subcommand) {
                case "kick": {
                    if (!member.kickable) {
                        return await interaction.reply({ content: "I cannot kick this user. Check if they have a higher role than me or if I have kick permissions.", ephemeral: true });
                    }

                    const reason = interaction.options.getString("reason") || "No reason provided";
                    
                    await member.kick(reason);
                    
                    logEmbed
                        .setTitle("User Kicked")
                        .setColor("#FF9900")
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: "User", value: `${target.tag} (${target.id})` },
                            { name: "Reason", value: reason }
                        );
                    
                    // Log to the mod log channel if it exists
                    if (modConfig.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(modConfig.logChannel);
                        if (logChannel) logChannel.send({ embeds: [logEmbed] });
                    }
                    
                    return await interaction.reply({ content: `Kicked ${target.tag} | Reason: ${reason}`, ephemeral: true });
                }
                
                case "ban": {
                    const reason = interaction.options.getString("reason") || "No reason provided";
                    const days = interaction.options.getInteger("days") || 0;
                    
                    await interaction.guild.members.ban(target, { deleteMessageDays: days, reason: reason });
                    
                    logEmbed
                        .setTitle("User Banned")
                        .setColor("#FF0000")
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: "User", value: `${target.tag} (${target.id})` },
                            { name: "Reason", value: reason },
                            { name: "Message deletion", value: `${days} days` }
                        );
                    
                    // Log to the mod log channel if it exists
                    if (modConfig.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(modConfig.logChannel);
                        if (logChannel) logChannel.send({ embeds: [logEmbed] });
                    }
                    
                    return await interaction.reply({ content: `Banned ${target.tag} | Reason: ${reason}`, ephemeral: true });
                }
                
                case "timeout": {
                    if (!member.moderatable) {
                        return await interaction.reply({ content: "I cannot timeout this user. Check if they have a higher role than me or if I have timeout permissions.", ephemeral: true });
                    }
                    
                    const duration = interaction.options.getInteger("duration");
                    const reason = interaction.options.getString("reason") || "No reason provided";
                    
                    // Convert minutes to milliseconds
                    const timeoutDuration = duration * 60 * 1000;
                    
                    await member.timeout(timeoutDuration, reason);
                    
                    logEmbed
                        .setTitle("User Timed Out")
                        .setColor("#FFCC00")
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: "User", value: `${target.tag} (${target.id})` },
                            { name: "Duration", value: `${duration} minutes` },
                            { name: "Reason", value: reason }
                        );
                    
                    // Log to the mod log channel if it exists
                    if (modConfig.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(modConfig.logChannel);
                        if (logChannel) logChannel.send({ embeds: [logEmbed] });
                    }
                    
                    return await interaction.reply({ content: `Timed out ${target.tag} for ${duration} minutes | Reason: ${reason}`, ephemeral: true });
                }
                
                case "warn": {
                    const reason = interaction.options.getString("reason");
                    
                    // Get warnings for this guild
                    const warnings = config.getWarnings(guildId);
                    
                    // Initialize user warnings if they don't exist
                    if (!warnings[target.id]) {
                        warnings[target.id] = [];
                    }
                    
                    // Add the warning
                    warnings[target.id].push({
                        moderator: interaction.user.id,
                        reason: reason,
                        timestamp: Date.now()
                    });
                    
                    // Save the updated warnings
                    config.saveWarnings(guildId, warnings);
                    
                    logEmbed
                        .setTitle("User Warned")
                        .setColor("#FFFF00")
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: "User", value: `${target.tag} (${target.id})` },
                            { name: "Reason", value: reason },
                            { name: "Total Warnings", value: warnings[target.id].length.toString() }
                        );
                    
                    // Log to the mod log channel if it exists
                    if (modConfig.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(modConfig.logChannel);
                        if (logChannel) logChannel.send({ embeds: [logEmbed] });
                    }
                    
                    // DM the user about the warning
                    try {
                        await target.send(`You have been warned in ${interaction.guild.name} for: ${reason}`);
                    } catch (error) {
                        // User might have DMs disabled
                        Logger.logRed(`Could not DM user ${target.tag}: ${error}`);
                    }
                    
                    return await interaction.reply({ content: `Warned ${target.tag} | Reason: ${reason}`, ephemeral: true });
                }
                
                case "warnings": {
                    // Get warnings for this guild
                    const warnings = config.getWarnings(guildId);
                    
                    // Check if user has warnings
                    if (!warnings[target.id] || warnings[target.id].length === 0) {
                        return await interaction.reply({ content: `${target.tag} has no warnings.`, ephemeral: true });
                    }
                    
                    // Create an embed with all warnings
                    const warningsEmbed = new EmbedBuilder()
                        .setTitle(`Warnings for ${target.tag}`)
                        .setColor("#FFFF00")
                        .setThumbnail(target.displayAvatarURL())
                        .setFooter({ text: `Total Warnings: ${warnings[target.id].length}` });
                    
                    // Add each warning to the embed
                    warnings[target.id].forEach((warn, index) => {
                        const moderator = interaction.guild.members.cache.get(warn.moderator);
                        const modName = moderator ? moderator.user.tag : "Unknown Moderator";
                        const date = new Date(warn.timestamp).toLocaleDateString();
                        
                        warningsEmbed.addFields({
                            name: `Warning ${index + 1} - ${date}`,
                            value: `**Moderator:** ${modName}\n**Reason:** ${warn.reason}`
                        });
                    });
                    
                    return await interaction.reply({ embeds: [warningsEmbed], ephemeral: true });
                }
                
                case "clearwarns": {
                    // Get warnings for this guild
                    const warnings = config.getWarnings(guildId);
                    
                    // Check if user has warnings
                    if (!warnings[target.id] || warnings[target.id].length === 0) {
                        return await interaction.reply({ content: `${target.tag} has no warnings to clear.`, ephemeral: true });
                    }
                    
                    // Clear warnings for the user
                    const warningCount = warnings[target.id].length;
                    warnings[target.id] = [];
                    
                    // Save the updated warnings
                    config.saveWarnings(guildId, warnings);
                    
                    logEmbed
                        .setTitle("Warnings Cleared")
                        .setColor("#00FF00")
                        .setThumbnail(target.displayAvatarURL())
                        .addFields(
                            { name: "User", value: `${target.tag} (${target.id})` },
                            { name: "Cleared Warnings", value: warningCount.toString() }
                        );
                    
                    // Log to the mod log channel if it exists
                    if (modConfig.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(modConfig.logChannel);
                        if (logChannel) logChannel.send({ embeds: [logEmbed] });
                    }
                    
                    return await interaction.reply({ content: `Cleared all warnings for ${target.tag}`, ephemeral: true });
                }
            }
        } catch (error) {
            Logger.logRed(error);
            return await interaction.reply({ content: "An error occurred while executing the command.", ephemeral: true });
        }
    }
};