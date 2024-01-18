const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        try {
            if(!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);

            if(!command){
                Logger.logGreen("Command not found!");
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                Logger.logRed(error)
                interaction.reply({ content: "Error while executing command."});
            }
        } catch (error) {
            Logger.logRed(error);
        }
    }
}