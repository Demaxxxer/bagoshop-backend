const formidable = require('formidable');
const fs = require('fs');
const path = require('path')
const { AsyncNedb } = require('nedb-async')

const db = new AsyncNedb({ filename: './data/items.db', autoload: true });

const itemFields = {
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
    defined: [
      'activ',
      'logic',
      'sim',
      'strat',
      'rpg',
      'race'
    ]
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

  nukeImages(upload = true){
    let gallery;
    let thumbnail;
    if(upload){
      gallery = this.gallery;
      thumbnail = this.thumbnail;
    } else {
      gallery = this.record.gallery;
      thumbnail = this.record.thumbnail;
    }

    gallery.forEach( i => {
      fs.unlink(i, err => {
        if(err) throw err;
      });
    });
    if(thumbnail){
      fs.unlink(thumbnail, err => {
        if(err) throw err;
      });
    }
  }

  setItemInfo(body){
    this.inputData = {};

    for (const field in itemFields) {
      //Testuje jestli bylo pole vůbec poslané
      if(typeof(body[field]) != 'string'){
        return {
          err: true,
          field: field,
          type: 'empty'
        }
      }
      //Testuje jestli neni řetězec prázdný
      if(body[field].length == 0){
        return {
          err: true,
          field: field,
          type: 'empty'
        }
      }
      //Minimální délka řetězce
      if(itemFields[field].min){
        if(body[field].length < itemFields[field].min){
          return {
            err: true,
            field: field,
            type: 'short'
          }
        }
      }
      //Maximalní delka řetězce
      if(itemFields[field].max){
        if(body[field].length > itemFields[field].max){
          return {
            err: true,
            field: field,
            type: 'long'
          }
        }
      }
      //Zkouší regulární výraz
      if(itemFields[field].patt){
        if(body[field].length == 0){
          return {
            err: true,
            field: field,
            type: 'empty'
          }
        }
        if(!itemFields[field].patt.test(body[field])){
          return {
            err: true,
            field: field,
            type: 'wrongChars'
          }
        }
      }
      //Zkouší jestli je pole číslo
      if(itemFields[field].number){
        if(isNaN(body[field])){
          return {
            err: true,
            field: field,
            type: 'notANumber'
          }
        }
      }

      //Zkouší jestli je pole datum
      if(itemFields[field].date){

        if(isNaN(Date.parse(body[field]))){
          return {
            err: true,
            field: field,
            type: 'notADate'
          }
        }

      }

      if(itemFields[field].defined){
        if(itemFields[field].defined.indexOf(body[field]) == -1){
          return {
            err: true,
            field: field,
            type: 'invalidOption'
          }
        }

      }
      this.inputData[field] = body[field];
    }

    return {
      err: false
    }

  }


  async saveNewItem(){
    this.inputData.gallery = this.gallery;
    this.inputData.thumbnail = this.thumbnail;
    this.inputData.release = Date.parse(this.inputData.release);
    this.inputData.cost = parseInt(this.inputData.cost);
    this.inputData.sold = 0;
    let record;

    //Ukládá záznam
    try {
      record = await db.asyncInsert(this.inputData);
    } catch (err) {
      return {
        code: 500,
      }
    }

    return {
      code: false,
      id: record._id
    }
  }

  validItemQuery(params){
    //limit
    const keys = ['name','cat','costMin','costMax','storage'];
    const patt = /^[A-Ža-ž0-9 /()@#.,:_-]+$/;
    let query = {};

    for (const i in keys){
      const key = keys[i]
      if(typeof(params[key]) == 'string' && params[key].length > 0){
        if(key == 'name'){
          if(patt.test(params[key])){
            query.name = {$regex: new RegExp(params[key],'i')}
          }
          continue;
        }
        if(key == 'cat'){
          if(itemFields.cat.defined.indexOf(params[key]) != -1){
            query.cat = params[key]
          }
          continue;
        }
        if(key == 'costMin' || key == 'costMax'){
          if(!isNaN(params[key])){
            if(key == 'costMin'){
              query.cost = { $gte: parseInt(params[key]) };
            } else {
              if(query.cost){
                query.cost.$lte = parseInt(params[key]);
              } else {
                query.cost = { $lte: parseInt(params[key]) };
              }
            }
          }
        }
        if(key == 'storage'){
          query.storage = params[key] == 'true';
        }
      }
    }
    return query;
  }

  validItemPosition(params,key){
    if(typeof(params[key]) == 'string' && params[key].length > 0 && !isNaN(params[key])){
      if(key == 'limit'){
        return Math.min(params[key],20);
      }
      return params[key];
    }
  }

  validItemSort(params){
    const sorts = {
      soldUp: {sold: -1},
      costUp: {cost: -1},
      costDown: {cost: 1}
    }
    if(typeof(params.sort) == 'string' && params.sort.length > 0 && sorts[params.sort]){
      return sorts[params.sort]
    }
  }

  async findItem(query){
    let item;
    try {
      item = await db.asyncFindOne(query)
    } catch(err) {
      return {
        code: 500,
      }
    }
    this.record = item;
    return {
      code: false,
    }
  }

  async findItems(query,max = 20,fromTop = 0,sort = {}){
    let items;
    try {
      items = await db.asyncFind(query,[['limit',max],['skip',fromTop],['sort',sort]])
    } catch(err) {
      console.log(err);
      return {
        code: 500,
      }
    }
    this.records = items;
    return {
      code: false,
    }

  }

  async deleteItem(){
    try {
      await db.asyncRemove({ _id: this.record._id });
    } catch(err) {
      return {
        code: 500
      }
    }
    this.nukeImages(false)
    return {
      code: false,
    }
  }

}
