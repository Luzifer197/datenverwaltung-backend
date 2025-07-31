const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Logger = require("./utils/logger");

const app = express();
const PORT = 3000;
const logger = new Logger("logs/server.log");

app.use(express.json());

// File Upload Setup (Multer)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.body.userId;
        if (!userId) return cb(new Error("Missing userId"), null);

        const uploadPath = path.join(__dirname, "upload", userId);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname);
    }
});

const upload = multer({ storage });


// ===================== ROUTES ===================== //

// POST /documents => Datei-Upload in /upload/userId/
app.post("/documents", upload.single("file"), (req, res) => {
    const userId = req.body.userId;
    if (!req.file || !userId) {
        logger.warn(`Fehlender userId oder Datei beim Upload`);
        return res.status(400).json({ message: "Fehlender userId oder Datei" });
    }

    logger.log(`Datei ${req.file.filename} für User ${userId} hochgeladen`);
    res.status(200).json({ message: "Upload erfolgreich", file: req.file.filename });
});


// GET /documents?userId=xxx => Liefert alle Dateien für den Nutzer
app.get("/documents", (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        logger.warn("GET /documents ohne userId");
        return res.status(400).json({ message: "Fehlender userId" });
    }

    const dirPath = path.join(__dirname, "upload", userId);
    if (!fs.existsSync(dirPath)) {
        logger.log(`GET /documents: Keine Dateien für ${userId}`);
        return res.status(200).json([]);
    }

    const files = fs.readdirSync(dirPath);
    logger.log(`GET /documents: ${files.length} Dateien für ${userId} gefunden`);
    res.status(200).json(files);
});


// POST /logger => Schreibt Logs vom Frontend ins Logfile
app.post("/logger", (req, res) => {
    const { level, message } = req.body;
    if (!level || !message) {
        return res.status(400).json({ message: "Fehlende Felder: level oder message" });
    }

    switch (level) {
        case "info":
            logger.log(message);
            break;
        case "warn":
            logger.warn(message);
            break;
        case "error":
            logger.error(message);
            break;
        default:
            return res.status(400).json({ message: "Ungültiger Log-Level" });
    }

    res.status(200).json({ message: "Log geschrieben" });
});


// ================ START SERVER =================== //

app.listen(PORT, () => {
    logger.log(`Server gestartet auf Port ${PORT}`);
});
