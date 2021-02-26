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
//Nastavení uploadu
formOptions = {
  encoding: 'utf-8',
  keepExtensions: true,
  maxFileSize: 50 * 1024 * 1024,
  uploadDir: './uploads',
  multiples: true
}

exports.create = async function(req,res){
  const form = new formidable(formOptions);

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
    if(!item.addImage(formname,file)){
        fs.unlink(file.path, err => {
          if(err) throw err;
        });
    }
  });

  //Callback je zavolán po uploadu všech souborů
  form.parse(req, async (err, fields, files) => {
    if(err){
      return;
    }

    //Validace když obrázký chybí, je zbytek vymazán
    if(item.gallery.length == 0 || !item.thumbnail){
      item.nukeImages();
      res.status(400).json({field:'galleryOrThumbnail'}).end();
      return;
    }


    const result = item.setItemInfo(fields);
    if(result.err){
      item.nukeImages();
      res.status(400).json(result).end();
      return;
    }

    const exists = await item.findItem({name: item.inputData.name})
    if(exists.code){
      item.nukeImages();
      res.status(exists.code).end();
      return;
    }

    if(item.record){
      item.nukeImages();
      res.status(409).end();
      return;
    }

    const created = await item.saveNewItem();
    if(created.code){
      item.nukeImages();
      res.status(created.code).end();
      return;
    }

    res.status(201).json(created).end();

  });
}

/*
  * Je možné použít tyto parametry:
  * name - pomocí části jména
  * cat - podle kategorie
  * costMin - minimální cena rozmezí
  * costMax - maximalní cena
  * limit - kolik itemu je možné vrátit z batabáze
  * skip - přezkočí itemy v databázi
  * sort - [soldUp,costUp,costDown] seřadí podle prodejů nebo ceny
*/

exports.getAll = async function(req,res){
  let item = new Item();

  const search = item.validItemQuery(req.query)

  let limit = item.validItemPosition(req.query,'limit')
  let skip = item.validItemPosition(req.query,'skip');
  let sort = item.validItemSort(req.query);

  const records = await item.findItems(search,limit,skip,sort);
  if(records.code){
    res.status(records.code).end();
    return;
  }

  res.status(200).json(item.records).end();

}
