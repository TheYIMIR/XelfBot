const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

module.exports = {
    data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Provides information about the user.")
    .addUserOption(option => option.setName("target").setDescription("The users information")),
    async execute(interaction) {
        try {
            const user = interaction.options.getUser("target");
            const member = interaction.options.getMember("target");

            const embed = new EmbedBuilder();
            embed.setTimestamp();
            if(user){
                embed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL(URL), url: null })
                embed.addFields(
                    { name: "Joined at:", value: `${member.joinedAt}` },
                    { name: "Roles:", value: `${member.roles.cache.map(r => `${r}`).join(' | ')}` }
                )
            }
            else{
                embed.setAuthor({name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL(URL), url: null})
                embed.addFields(
                    { name: "Joined at:", value: `${interaction.member.joinedAt}`},
                    { name: "Roles:", value: `${interaction.member.roles.cache.map(r => `${r}`).join(' | ')}`, inline: true}
                )
            }
            return await interaction.reply({ embeds: [embed], ephemeral: true })
        } catch (error) {
            
        }
    }
}