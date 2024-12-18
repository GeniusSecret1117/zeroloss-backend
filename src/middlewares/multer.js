const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('inside destina', file);
        console.log('dirname', __dirname);
        const filePath = path.join(__dirname, '../../images/profileImages');
        console.log('filepat', filePath);
        cb(null, filePath);
    },
    filename: (req, file, cb) => {
        console.log('inside filename', file);
        const date = new Date();
        const modFilename = `${date.toISOString().replace(/ /g, '_').replace(/:/g, '')}_${file.originalname}`;
        console.log('mod file name', modFilename);
        cb(null, modFilename);
    },
});

const upload = multer({ storage });

module.exports = upload;
