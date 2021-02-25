const formidable = require('formidable');
const fs = require('fs');
const path = require('path')

const Item = require('../models/Item.js');

//Povolené typy souborů
const fileTypes = [
  'image/png',
  'image/jpeg',
  'image/svg+xml'
];

exports.create = async function(req,res){
  //Nastavení uploadu
  const form = new formidable({
    encoding: 'utf-8',
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024,
    uploadDir: './public/upload/tmp',
    multiples: true
  });

  //Ukončení když se objeví chyba při nahrávání
  form.on('error', err => {
    req.connection.destroy()
  });

  //Hlídá použití povolených souborů
  form.on('fileBegin', (name, file) => {
    if(fileTypes.indexOf(file.type) == -1)form.emit('error');
  });

  let item = new Item();

  //Přidává obrázek do objektu
  form.on('file', (formname, file) => {
    console.log(formname);
    if(!item.addImage(formname,file)){
        fs.unlink(file.path, err => {
          if(err) throw err;
        });
    }
  });

  //Callback je zavolán po uploadu všech souborů
  form.parse(req, (err, fields, files) => {
    if(err){
      return;
    }

    //Validace když obrázký chybí, je zbytek vymazán
    if(item.gallery.length == 0 || !item.thumbnail){
      item.gallery.forEach( i => {
        fs.unlink(i, err => {
          if(err) throw err;
        });
      });
      if(item.thumbnail){
        fs.unlink(item.thumbnail, err => {
          if(err) throw err;
        });
      }
      if(!res.headersSent){
        res.status(400).json({field:'galleryOrThumbnail'}).end()
      }
      return;
    }



    //console.log(item.gallery)
    //console.log(item.thumbnail)


    const result = item.setItemInfo(fields);



/*
    if(!files.gallery){
      res.status(422).end();
      return
    }
*/
    res.status(201).end();

  });


}
