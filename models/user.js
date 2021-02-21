const bcrypt = require('bcrypt');
const Datastore = require('nedb');

db = new Datastore({ filename: './data/users', autoload: true });

module.exports = class User {

  fields = {
    'firstname': {
      min: 2,
      max: 12,
      patt: /^[A-Ža-ž0-9 ]+$/
    },
    'surname': {
      min: 2,
      max: 12,
      patt: /^[A-Ža-ž0-9 ]+$/
    },
    'email': {
      min: 2,
      max: 50,
      patt: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/i,
      pattMsg: 'does not match email form'
    },
    'pass': {
      min: 8,
      max: 50,
      cb: body => {
        if(body.pass != body.passRepeat){
          return 'passwords do not match'
        }
      }
    },
    'passRepeat': {
      //Validated with match
    }


  }

  constructor(){
    //Asi tu ani nemusí být ale tak co už
  }

  setNewUserData(body){

    for (const field in this.fields) {

      if(typeof(body[field]) != 'string'){
        return {
          err: true,
          field: field,
          type: 'undefined'
        }
      }

      if(this.fields[field].min){
        if(body[field].length < this.fields[field].min){
          return {
            err: true,
            field: field,
            type: `few characters (${this.fields[field].min})`
          }
        }
      }

      if(this.fields[field].max){
        if(body[field].length > this.fields[field].max){
          return {
            err: true,
            field: field,
            type: `too many characters (${this.fields[field].max})`
          }
        }
      }

      if(this.fields[field].patt){
        if(!this.fields[field].patt.test(body[field])){
          let type = 'containing unsupported characters';
          if(this.fields[field].pattMsg){
            type = this.fields[field].pattMsg
          }
          return {
            err: true,
            field: field,
            type: type
          }
        }
      }

      if(this.fields[field].cb){
        const err = this.fields[field].cb(body)
        if(err){
          return {
            err: true,
            field: field,
            type: err
          }
        }

      }

      this[field] = body[field];
    }

    return {
      err: false
    }
  }

  async saveNewUser(){

    this.passHash = await bcrypt.hash(this.pass, 10);

    const record = {
      fname: this.firstname,
      sname: this.surname,
      email: this.email,
      pass: this.passHash
    }

    const find = new Promise((resolve, reject) => {
      db.insert(record, function (err, newDoc) {
        if (err) reject(err)
        resolve(newDoc)
      });
    })

    try {
      const newDoc = await find
      console.log(newDoc)
    } catch (err) {

    }


  }

}
