const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Logger = require("./utils/logger");

const app = express();
const PORT = 3000;
const logger = new Logger("logs/server.log");

app.use(express.json());

function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

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
        cb(null, getFormattedDate() + "_" + file.originalname);
    }
});

const upload = multer({ storage });


// ===================== ROUTES ===================== //

// DELETE /users => Löscht den User und alle zugehörigen Dateien
app.delete("/users", (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        logger.warn("DELETE /users: userId fehlt");
        return res.status(400).json({ message: "Fehlender userId" });
    }

    const userPath = path.join(__dirname, "upload", userId);

    if (!fs.existsSync(userPath)) {
        logger.warn(`DELETE /users: User ${userId} nicht gefunden`);
        return res.status(404).json({ message: "User nicht gefunden" });
    }

    fs.rmSync(userPath, { recursive: true, force: true });
    logger.log(`User ${userId} und alle Dateien gelöscht`);
    res.status(200).json({ message: `User ${userId} gelöscht` });
});


// DELETE /documents => Löscht den Dokument für den Nutzer
app.delete("/documents", (req, res) => {
    const { userId, file } = req.body;

    if (!userId || !file) {
        logger.warn("DELETE /documents: userId oder file fehlt");
        return res.status(400).json({ message: "Fehlender userId oder file" });
    }

    const filesToDelete = Array.isArray(file) ? file : [file];
    const notFoundFiles = [];
    const deletedFiles = [];

    filesToDelete.forEach(filename => {
        const filePath = path.join(__dirname, "upload", userId, filename);

        if (!fs.existsSync(filePath)) {
            logger.warn(`DELETE /documents: Datei ${filename} für User ${userId} nicht gefunden`);
            notFoundFiles.push(filename);
            return;
        }

        fs.unlinkSync(filePath);
        logger.log(`Datei ${filename} für User ${userId} gelöscht`);
        deletedFiles.push(filename);
    });

    res.status(200).json({
        message: "Löschvorgang abgeschlossen",
        deleted: deletedFiles,
        notFound: notFoundFiles
    });
});




// GET /users => Liste aller User-Verzeichnisse
app.get("/users", (req, res) => {
    const basePath = path.join(__dirname, "upload");

    if (!fs.existsSync(basePath)) {
        logger.log("GET /users: Keine User-Verzeichnisse vorhanden");
        return res.status(200).json([]);
    }

    // Verzeichnisse unter /upload lesen
    const users = fs.readdirSync(basePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    logger.log(`GET /users: ${users.length} User gefunden`);
    res.status(200).json(users);
});


// POST /documents => Datei-Upload in /upload/userId/
app.post("/documents", upload.array("file"), (req, res) => {
    const userId = req.body.userId;
    if (!req.files || req.files.length === 0 || !userId) {
        logger.warn(`Fehlender userId oder Datei(en) beim Upload`);
        return res.status(400).json({ message: "Fehlender userId oder Datei(en)" });
    }

    const uploadedFiles = req.files.map(f => f.filename);

    logger.log(`Dateien ${uploadedFiles.join(", ")} für User ${userId} hochgeladen`);
    res.status(200).json({ message: "Upload erfolgreich", files: uploadedFiles });
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
    const frontendlogger = new Logger("logs/frontend.log");
    
    if (!level || !message) {
        return res.status(400).json({ message: "Fehlende Felder: level oder message" });
    }

    switch (level) {
        case "info":
            frontendlogger.log(message);
            break;
        case "warn":
            frontendlogger.warn(message);
            break;
        case "error":
            frontendlogger.error(message);
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
