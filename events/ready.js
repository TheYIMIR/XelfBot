const LoggerClass = require("../internal/Logger");
const Logger = new LoggerClass();

module.exports = {
    name: "ready",
    once: true,
    execute(client) {
        try {
            Logger.logGreen("Ready")
        } catch (error) {
            Logger.logRed(error);
        }
    }
}