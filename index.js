const os = require('os');
const util = require('util');
const express = require("express");
const multer  = require('multer')
const fs = require('fs');
const ipfsAPI = require('ipfs-api')

const app = express()
const userUpload = multer({ dest: os.tmpdir(), preservePath: true })
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'})

app.get('/', (req, res) => res.send('moac ipfs web demo'))

app.post('/upload', userUpload.single('add_to_ipfs'), (req, res) => {
    let tmpFilePath = util.format('%s/%s', os.tmpdir(), req.file.filename)
    console.log("Uploaded to", tmpFilePath)
    const files = [{
        path: req.file.filename,
        content: fs.createReadStream(tmpFilePath)
    }]
    ipfs.files.add(files, (err, files) => {
        console.log(files);
        fs.unlinkSync(tmpFilePath);
    })
    res.send({message: 'success'});
})

app.listen(18373, () => console.log('Ready to serve!'))
