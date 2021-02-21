const express = require('express');
const router = express.Router();

const userMiddlewares = require('./controllers/user');

router.get('/', (req, res) => {
  res.sendFile('index.html');
})



router.post('/user/create', userMiddlewares.create);








/*
router.post('/item/test/create', (req, res, next) => {

  const Datastore = require('nedb')

  db = new Datastore({ filename: './data/users', autoload: true });

  const doc = {
    name: req.body.name,
    desc: req.body.dec,
    releaseDate: req.body.releaseDate,
    cost: req.body.cost,
    stored: req.body.stored,
    category: req.body.category,
    images: [
      '56dasd',
      'sda564',
      '53sdasd',
      '1313ds'
    ],
    coverImage: 'lasd45'
  };

  db.insert(doc, function (err, newDoc) {
    res.status(201).json({newId: newDoc._id}).end()
  });

})
*/

router.post('/upload', async (req, res, next) => {

  //const magic = require('magic-number');
  //const multiparty = require('multiparty');
  //const busboy = require('busboy');
  //const bodyParser = require('body-parser');
  //const multer  = require('multer')
  //const { v4: uuidv4 } = require('uuid');

  const formidable = require('formidable');

  const fs = require('fs');
  const path = require('path')

  const form = new formidable({
    encoding: 'utf-8',
    keepExtensions: true,
    maxFileSize: 20 * 1024 * 1024,
    uploadDir: './upload/tmp',
    multiples: true
  });

  form.on('error', err => {
    req.connection.destroy()
  });

  const fileTypes = [
    'image/png',
    'image/jpeg',
    'image/svg+xml'
  ];

  form.on('fileBegin', (name, file) => {
    if(fileTypes.indexOf(file.type) == -1){
      form.emit('error',new Error('found wrong image file type'));
    }
  });

  form.parse(req, (err, fields, files) => {
    if(err){
      return
    }

    if(!files.gallery){
      res.status(422).end();
      return
    }

    res.status(201).end();

  });

})

module.exports = router;
