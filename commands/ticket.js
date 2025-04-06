const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");
const LoggerClass = require("../internal/Logger");
const ConfigManager = require("../internal/ConfigManager");
const Logger = new LoggerClass();
const config = new ConfigManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Ticket system commands")
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Setup the ticket system")
                .addChannelOption(option => 
                    option.setName("channel")
                        .setDescription("Channel to send the ticket panel")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName("support_role")
                        .setDescription("Role that can see tickets")
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName("category")
                        .setDescription("Category to create tickets in")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("close")
                .setDescription("Close a ticket"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a user to the ticket")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to add to the ticket")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a user from the ticket")
                .addUserOption(option => 
                    option.setName("user")
                        .setDescription("User to remove from the ticket")
                        .setRequired(true))),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            
            switch (subcommand) {
                case "setup": {
                    // Check for admin permissions
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return await interaction.reply({ content: "You need administrator permissions to use this command.", ephemeral: true });
                    }
                    
                    const channel = interaction.options.getChannel("channel");
                    const supportRole = interaction.options.getRole("support_role");
                    const category = interaction.options.getChannel("category");
                    
                    // Save ticket configuration
                    const ticketConfig = {
                        guildId: guildId,
                        supportRole: supportRole.id,
                        category: category.id,
                        ticketCounter: 0
                    };
                    
                    config.saveGuildConfig(guildId, "ticket", ticketConfig);
                    
                    // Create ticket panel
                    const embed = new EmbedBuilder()
                        .setTitle("Support Ticket")
                        .setDescription("Click the button below to create a support ticket.")
                        .setColor("#3498db")
                        .setFooter({ text: "StreamBot Support System" });
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("create_ticket")
                                .setLabel("Create Ticket")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("🎫")
                        );
                    
                    await channel.send({ embeds: [embed], components: [row] });
                    
                    return await interaction.reply({ content: "Ticket system has been set up successfully!", ephemeral: true });
                }
                
                case "close": {
                    // Check if the channel is a ticket
                    const ticketData = config.getTicketData(guildId, interaction.channel.id);
                    if (!ticketData) {
                        return await interaction.reply({ content: "This command can only be used in a ticket channel.", ephemeral: true });
                    }
                    
                    // Create a transcript
                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    let transcript = "Ticket Transcript\n\n";
                    
                    messages.reverse().forEach(msg => {
                        transcript += `${msg.author.tag} (${msg.createdAt.toLocaleString()}):\n${msg.content}\n\n`;
                    });
                    
                    const transcriptPath = config.saveTicketTranscript(guildId, interaction.channel.id, transcript);
                    
                    // Notify the user who created the ticket
                    try {
                        const creator = await interaction.client.users.fetch(ticketData.creator);
                        await creator.send({
                            content: `Your ticket (${interaction.channel.name}) has been closed.`,
                            files: [{
                                attachment: transcriptPath,
                                name: `transcript-${interaction.channel.name}.txt`
                            }]
                        });
                    } catch (error) {
                        Logger.logRed(`Could not DM ticket creator: ${error}`);
                    }
                    
                    // Delete the ticket data
                    config.deleteTicketData(guildId, interaction.channel.id);
                    
                    await interaction.reply({ content: "Closing ticket in 5 seconds..." });
                    
                    // Delete the channel after 5 seconds
                    setTimeout(() => {
                        interaction.channel.delete().catch(error => {
                            Logger.logRed(`Error deleting ticket channel: ${error}`);
                        });
                    }, 5000);
                    
                    break;
                }
                
                case "add": {
                    // Check if the channel is a ticket
                    const ticketData = config.getTicketData(guildId, interaction.channel.id);
                    if (!ticketData) {
                        return await interaction.reply({ content: "This command can only be used in a ticket channel.", ephemeral: true });
                    }
                    
                    const user = interaction.options.getUser("user");
                    
                    // Check if the user is already in the ticket
                    if (interaction.channel.permissionsFor(user.id).has(PermissionFlagsBits.ViewChannel)) {
                        return await interaction.reply({ content: `${user.tag} is already in this ticket.`, ephemeral: true });
                    }
                    
                    // Add the user to the ticket
                    await interaction.channel.permissionOverwrites.edit(user.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                    
                    return await interaction.reply({ content: `${user.tag} has been added to the ticket.` });
                }
                
                case "remove": {
                    // Check if the channel is a ticket
                    const ticketData = config.getTicketData(guildId, interaction.channel.id);
                    if (!ticketData) {
                        return await interaction.reply({ content: "This command can only be used in a ticket channel.", ephemeral: true });
                    }
                    
                    const user = interaction.options.getUser("user");
                    
                    // Check if the user is in the ticket
                    if (!interaction.channel.permissionsFor(user.id).has(PermissionFlagsBits.ViewChannel)) {
                        return await interaction.reply({ content: `${user.tag} is not in this ticket.`, ephemeral: true });
                    }
                    
                    // Check if the user is the creator
                    if (ticketData.creator === user.id) {
                        return await interaction.reply({ content: "You cannot remove the ticket creator.", ephemeral: true });
                    }
                    
                    // Remove the user from the ticket
                    await interaction.channel.permissionOverwrites.delete(user.id);
                    
                    return await interaction.reply({ content: `${user.tag} has been removed from the ticket.` });
                }
            }
        } catch (error) {
            Logger.logRed(error);
            return await interaction.reply({ content: "An error occurred while executing the command.", ephemeral: true });
        }
    }
};