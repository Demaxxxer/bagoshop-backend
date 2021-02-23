const bcrypt = require('bcrypt');
const { AsyncNedb } = require('nedb-async')
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const db = new AsyncNedb({ filename: './data/users.db', autoload: true });
const jwtKey = 'tady se třeba bude generovat token'

module.exports = class User {

  fields = {
    firstname: {
      min: 2,
      max: 12,
      patt: /^[A-Ža-ž0-9 ]+$/
    },
    surname: {
      min: 2,
      max: 12,
      patt: /^[A-Ža-ž0-9 ]+$/
    },
    email: {
      min: 2,
      max: 50,
      patt: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/i,
      pattMsg: 'Zadaný email neodpovídá email formě'
    },
    pass: {
      min: 8,
      max: 50,
    },
    passRepeat: {
      //Pouze kontroluje shodu
      cb: body => {
        if(body.pass != body.passRepeat){
          return 'Hesla se neshodují'
        }
      }
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
          type: 'nezadáno'
        }
      }

      if(this.fields[field].min){
        if(body[field].length < this.fields[field].min){
          return {
            err: true,
            field: field,
            type: `je moc krátké, minimálně (${this.fields[field].min}) znaků`
          }
        }
      }

      if(this.fields[field].max){
        if(body[field].length > this.fields[field].max){
          return {
            err: true,
            field: field,
            type: `je moc dlouhé, mamximálně (${this.fields[field].max}) znaků`
          }
        }
      }

      if(this.fields[field].patt){
        if(!this.fields[field].patt.test(body[field])){
          let type = 'Obsahuje nepovolené znaky';
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
    //Vytváří hash hesla
    this.passHash = await bcrypt.hash(this.pass, 10);

    //Nový objekt záznamu
    const record = {
      fname: this.firstname,
      sname: this.surname,
      email: this.email,
      pass: this.passHash,
      isAdmin: false,
      tokens: []
    }

    //Ukládá záznam
    try {
      await db.asyncInsert(record)
    } catch (err) {
      return {
        err: true,
        type: err
      }
    }

    return {
      err: false
    }

  }

  async findUser(query){
    let user;
    try {
      user = await db.asyncFindOne(query)
    } catch(err) {
      return {
        err: true,
        type: err
      }
    }
    this.record = user;
    return {
      err: false,
      user: user
    }

  }

  getReturnInfo(){
    delete this.record.tokens;
    delete this.record.pass;
    delete this.record._id;
    return this.record;
  }

  async createAccessToken(ip){
    //Kontroluje jestli už neni moc přihlašovacích žetonů
    if (this.record.tokens.length > 2){
      this.record.tokens.splice(0,1)
    }
    //Vytváří nový žeton
    const newToken = {
      host: ip,
      key: uuidv4(),
      createdAt: new Date()
    }
    //Přidává žeton k účtu
    this.record.tokens.push(newToken);
    //Ukládá žetony
    try {
      await db.asyncUpdate({ _id: this.record._id }, { $set: { tokens: this.record.tokens } });
    } catch(err) {
      return {
        err: true,
        type: err
      }
    }
    //Šifruje žeton pomocí JWT
    const generated = jwt.sign({
      userId: this.record._id,
      userToken: newToken.key
    }, jwtKey)

    return {
      err: false,
      jwt: generated
    }
  }

  async validUserToken(req){
    const token = req.cookies.sessionToken
    if(!token){
      return {
        err: true,
        type: 'Nebyl zadán přihlašovací žeton'
      }
    }
    let verifed;
    try {
      verifed = await jwt.verify(token,jwtKey);
    } catch {
      return {
        err: true,
        type: 'Přihlašovací žeton nemá správný formát'
      }
    }

    const found = await this.findUser({ _id: verifed.userId });
    if(found.err){
      return {
        err: true,
        type: found.err
      }
    }

    if(!this.record){
      return {
        err: true,
        type: 'Uživatel nenalezen'
      }
    }

    for(const i in this.record.tokens){
      if(this.record.tokens[i].key == verifed.userToken){
        this.activeToken = this.record.tokens[i];
        return {
          err: false,
          user: this.record
        }
      }
    }

    return {
      err: true,
      type: 'Neplatný přihlašovací žeton'
    }

  }

  async removeUserToken(){
    //console.log(this.record.tokens);
    const newArray = this.record.tokens.filter(token => token.key != this.activeToken.key)

    try {
      await db.asyncUpdate({ _id: this.record._id }, { $set: { tokens: newArray } });
    } catch(err) {
      return {
        err: true,
        type: err
      }
    }

    return {
      err: false,
    }

  }


  async findUsers(query){
    let users;
    try {
      users = await db.asyncFind(query,{fname: 1,sname: 1,email: 1, isAdmin: 1})
    } catch(err) {
      return {
        err: true,
        type: err
      }
    }
    this.records = users;
    return {
      err: false,
    }

  }


  async setAdmin(value){
    try {
      await db.asyncUpdate({ _id: this.record._id }, { $set: { isAdmin: Boolean(value) } });
    } catch(err) {
      return {
        err: true,
        type: err
      }
    }

    return {
      err: false,
    }

  }

}
