const winston = require("winston");
const colors = require("colors");
const fs = require("fs");

class Logger {
    constructor(file) {
        // Löschen Sie das vorhandene Logfile, falls es existiert
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }

        this.logger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: file,
                    maxFiles: 0 // Überschreibt das Logfile bei jedem Neustart des Programms
                })
            ],
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `[${timestamp}] ${level}: ${message}`;
                })
            )
        });
    }

    log(text) {
        this.logger.info(text);
        console.log(colors.grey(`[${new Date().toLocaleString()} | BACKEND]`) + colors.green(`| ${text}`));
    }

    warn(text) {
        this.logger.warn(text);
        console.log(colors.grey(`[${new Date().toLocaleString()} | BACKEND]`) + colors.yellow(`| ${text}`));
    }

    error(text) {
        this.logger.error(text);
        console.log(colors.grey(`[${new Date().toLocaleString()} | BACKEND]`) + colors.red(`| ${text}`));
    }
}

module.exports = Logger;