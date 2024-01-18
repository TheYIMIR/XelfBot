class Logger {
    constructor(){
        this.colors = require("./colors.json");
    }

    log(message){
        const packageJson = require("../package.json");
        console.log(`[${packageJson.name}] ${message}`);
    }

    logGreen(message){
        const packageJson = require("../package.json");
        console.log(`${this.colors.textColors.green}[${packageJson.name}] ${message}${this.colors.textStyles.normal}`);
    }

    logRed(message){
        const packageJson = require("../package.json");
        console.log(`${this.colors.textColors.red}[${packageJson.name}] ${message}${this.colors.textStyles.normal}`);
    }

    logYellow(message){
        const packageJson = require("../package.json");
        console.log(`${this.colors.textColors.yellow}[${packageJson.name}] ${message}${this.colors.textStyles.normal}`);
    }

    logBlue(message){
        const packageJson = require("../package.json");
        console.log(`${this.colors.textColors.black}[${packageJson.name}] ${message}${this.colors.textStyles.normal}`);
    }

    logMagenta(message){
        const packageJson = require("../package.json");
        console.log(`${this.colors.textColors.magenta}[${packageJson.name}] ${message}${this.colors.textStyles.normal}`);
    }

    logCyan(message){
        const packageJson = require("../package.json");
        console.log(`${this.colors.textColors.cyan}[${packageJson.name}] ${message}${this.colors.textStyles.normal}`);
    }
}

module.exports = Logger;