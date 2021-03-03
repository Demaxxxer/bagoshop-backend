const formidable = require('formidable');
const fs = require('fs');
const path = require('path')

const Item = require('../models/item');
const User = require('../models/user');

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
  let user = new User();
  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).end();
    return;
  }

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
      res.status(500).json(result).end();
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

exports.edit = async function(req,res){
  let user = new User();
  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).end();
    return;
  }

  //Kontrola jestli je item v datbázi
  let item = new Item();
  const exists = await item.findItem({_id: req.query.id})
  if(exists.code){
    res.status(code).end();
    return;
  }
  if(!item.record){
    res.status(404).end();
    return;
  }

  const form = new formidable(formOptions);

  //Ukončení když se objeví chyba při nahrávání
  form.on('error', err => {
    req.connection.destroy()
  });

  //Hlídá použití povolených souborů
  form.on('fileBegin', (name, file) => {
    if(fileTypes.indexOf(file.type) == -1)form.emit('error');
  });


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
      item.nukeImages();
      res.status(500).end();
      return;
    }

    //Získává změně obrázky
    let galleryOld;
    try {
      galleryOld = JSON.parse(fields.galleryOld)
    } catch(err) {
      item.nukeImages();
      res.status(400).json({field:'galleryOld'}).end();
      return;
    }

    //Kontroluje formulářové vstupy
    const result = item.setItemInfo(fields);
    if(result.err){
      item.nukeImages();
      res.status(400).json(result).end();
      return;
    }

    //Když neni ani jeden obrázek v gallerii
    if(galleryOld.length == 0 && item.gallery.length == 0){
      item.nukeImages();
      res.status(400).json({field:'galleryOrThumbnail'}).end();
      return;
    }

    //Kontrola stejného jména u více produktů
    if(item.inputData.name != item.record.name){
      const same = await item.findItems({name: item.inputData.name})
      if(same.code){
        item.nukeImages();
        res.status(same.code).end();
        return;
      }
      if(item.records.length > 0){
        item.nukeImages();
        res.status(409).end();
        return;
      }
    }


    //Hledá rozdíly obrázků
    let toDelete = [];
    let toConcat = [];
    item.record.gallery.forEach( img => {
      if(galleryOld.indexOf(img) == -1){
        toDelete.push(img);
      } else {
        toConcat.push(img);
      }
    });

    //Když je poslán nový thubmnail tak je starý vymazán
    if(item.thumbnail){
      fs.unlink(item.record.thumbnail, err => {
        if(err) throw err;
      });
    }
    //Maže rozdílné obrázky
    toDelete.forEach( img => {
      fs.unlink(img, err => {
        if(err) throw err;
      });
    });
    item.gallery = item.gallery.concat(toConcat)

    const saved = await item.saveItem();
    if(saved.code){
      res.status(saved.code).end();
      return;
    }

    res.status(200).end();

  });
}

exports.get = async function(req,res){
  let item = new Item();
  const records = await item.findItem({_id: req.query.id});
  if(records.code){
    res.status(records.code).end();
    return;
  }

  if(!item.record){
    res.status(404).end();
    return;
  }

  res.status(200).json(item.record).end();
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

exports.getByCart = async function(req,res){
  //Kontrola validity ideček
  let ids;
  try {
    const cartData = JSON.parse(req.query.cart)
    ids = Object.keys(cartData)
    if(!Array.isArray(ids)){
      res.status(400).end();
      return;
    }
  } catch {
    res.status(400).end();
    return;
  }

  let item = new Item()
  const records = await item.findItems({ _id: { $in: ids }},0);
  if(records.code){
    res.status(records.code).end();
    return;
  }
  
  res.status(200).json(item.records).end();
}

exports.delete = async function(req,res){
  let user = new User();
  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).end();
    return;
  }

  let item = new Item();
  //Hledání itemu pomocí id
  const record = await item.findItem({_id: req.body.id});
  if(record.code){
    res.status(record.code).end();
    return;
  }
  //Item nenalezen
  if(!item.record){
    res.status(404).end();
    return;
  }

  const result = await item.deleteItem()
  if(result.code){
    res.status(result.code).end();
    return;
  }

  res.status(200).end();
}
