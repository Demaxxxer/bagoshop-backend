const express = require('express');
const router = express.Router();

const userMiddlewares = require('./controllers/user');

const itemMiddlewares = require('./controllers/item');

router.get('/', (req, res) => {
  res.sendFile('index.html');
})


router.post('/api/user/create', userMiddlewares.create);

router.post('/api/user/login', userMiddlewares.login);

router.get('/api/user/loged', userMiddlewares.loged);

router.post('/api/user/logout', userMiddlewares.logout);

router.get('/api/user/get', userMiddlewares.get);

router.patch('/api/user/admin', userMiddlewares.setAdmin);

router.delete('/api/user/delete', userMiddlewares.delete);


router.post('/api/item/create', itemMiddlewares.create);







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
