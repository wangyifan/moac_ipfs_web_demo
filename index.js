const os = require('os');
const util = require('util');
const express = require("express");
const multer  = require('multer')
const fs = require("fs")
const ipfsAPI = require('ipfs-api')
const redis = require('redis')

const app = express();
const userUpload = multer({ dest: os.tmpdir(), preservePath: true });
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const redisClient = redis.createClient();
const ipfsFileMappingHash = 'ipfs_file_mapping_hash'

// set view engine
app.set('view engine', 'hbs');

// simple logging
app.use((req, res, next) => {
    const now = new Date().toString();
    console.log(`${now}: ${req.method} ${req.url}`);
    next();
});

// resource
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/popperjs', express.static(__dirname + '/node_modules/popper.js/dist'));

// add index route
app.get('/', (req, res) => {
    res.render('index.hbs')
})

// add upload file route
app.post('/upload', userUpload.single('add_to_ipfs'), async (req, res) => {
    let tmpFilePath = util.format('%s/%s', os.tmpdir(), req.file.filename)
    console.log("Uploaded to", tmpFilePath)
    const files = [{
        path: req.file.filename,
        content: fs.createReadStream(tmpFilePath)
    }];
    const addFileResult = await ipfs.files.add(files)
    const fileHash = addFileResult[0]['hash']
    console.log("ipfs added:", fileHash)
    // remove tmp file
    fs.unlinkSync(tmpFilePath);
    // register with redis
    redisClient.hset(ipfsFileMappingHash, req.file.originalname, fileHash)
    res.send({message: 'success', hash: fileHash, name: req.file.originalname});
})

// start server
app.listen(18373, () => console.log('Ready to serve!'))
