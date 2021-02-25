/*
nazev
cena
skladem
popis
hardwerové požadavky

datum vydáni

počet kupeni

kategorie: [
  activ
  logic
  sim
  strat
  rpg
  race
]

obrazek náhledu

obrazek náhledu na produktové stránce

obrázky gameplaye

*/


const formidable = require('formidable');
const fs = require('fs');
const path = require('path')
const { AsyncNedb } = require('nedb-async')

const db = new AsyncNedb({ filename: './data/items.db', autoload: true });

itemFields = {
  name: {
    min: 2,
    max: 50,
    patt: /^[A-Ža-ž0-9 /()@#.,:_-]+$/
  },
  storage: {
    number: true
  },
  cost: {
    number: true
  },
  release: {
    date: true
  },
  cat: {
    defined: []
  },
  desc: {

  },
  os: {
    patt: /^[A-Ža-ž0-9 /()@#.,:_-]+$/
  },
  cpu: {
    patt: /^[A-Ža-ž0-9 /()@#.,:_-]+$/
  },
  gpu: {
    patt: /^[A-Ža-ž0-9 /()@#.,:_-]+$/
  },
  ram: {
    number: true
  },
  dx: {
    patt: /^[A-Ža-ž0-9 /()@#.,:_-]+$/
  }
}


module.exports = class Item {
  gallery = []
  thumbnail = false

  addImage(type,file){
    if(type == 'thumbnail' && !this.thumbnail){
      this.thumbnail = file.path;
      return true;
    } else if (type == 'gallery' && this.gallery.length < 10) {
      this.gallery.push(file.path);
      return true;
    } else {
      return false;
    }
  }


  setItemInfo(body){

    for (const field in userFields) {

      if(typeof(body[field]) != 'string'){
        return {
          err: true,
          field: field,
          type: 'empty'
        }
      }

    }

  }






}
