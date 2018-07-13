const os = require("os");
const util = require("util");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const ipfsAPI = require("ipfs-api");
const Promise = require("bluebird");
const redis = Promise.promisifyAll(require("redis"));
const hbs = require("hbs");

const app = express();
const userUpload = multer({ dest: os.tmpdir(), preservePath: true });
const ipfs = ipfsAPI("localhost", "5001", { protocol: "http" });
const redisClient = redis.createClient();
const ipfsFileMappingHash = "ipfs_file_mapping_hash";
const ipfsFileList = "ipfs_file_list";

// set view engine
app.set("view engine", "hbs");

// simple logging
app.use((req, res, next) => {
    const now = new Date().toString();
    console.log(`${now}: ${req.method} ${res.statusCode} ${req.url}`);
    next();
});

// set partials
hbs.registerPartials(__dirname + "/views/partials");

// resource
app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist"));
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist/"));
app.use("/popperjs", express.static(__dirname + "/node_modules/popper.js/dist"));
app.use("/fileinput", express.static(__dirname + "/node_modules/bootstrap-fileinput"));

// add index handler
app.get("/", async (req, res) => {
    // get all files
    var files = await redisClient.lrangeAsync(ipfsFileList, 0, -1);
    files = files.map(file => {
        return JSON.parse(file);
    });
    res.render("index.hbs", { files: files });
});

// add upload file handler
app.post("/upload", userUpload.single("add_to_ipfs"), async (req, res) => {
    if (typeof req.file == "undefined") {
        res.redirect("/");
    }

    let tmpFilePath = util.format("%s/%s", os.tmpdir(), req.file.filename);
    console.log("Uploaded to", tmpFilePath);
    const files = [
        {
            path: req.file.originalname,
            content: fs.createReadStream(tmpFilePath)
        }
    ];
    const addFileResult = await ipfs.files.add(files, { wrapWithDirectory: true });
    // second hash is the one with file name
    const fileHash = addFileResult[1]["hash"];
    console.log("ipfs added:", addFileResult);
    // remove tmp file
    fs.unlinkSync(tmpFilePath);
    // register with redis
    redisClient.hset(ipfsFileMappingHash, req.file.originalname, fileHash);
    redisClient.lpush(ipfsFileList, JSON.stringify({ name: req.file.originalname, hash: fileHash }));
    res.redirect("/");
    //res.send({ message: "success", hash: fileHash, name: req.file.originalname });
});

// start server
app.listen(18373, () => console.log("Ready to serve!"));
