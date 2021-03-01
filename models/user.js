const bcrypt = require('bcrypt');
const { AsyncNedb } = require('nedb-async')
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const db = new AsyncNedb({ filename: './data/users.db', autoload: true });
const jwtKey = 'tady se třeba bude generovat token'

const inputFields = {
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
  },
  pass: {
    min: 8,
    max: 50,
  },
  passRepeat: {
    //Pouze kontroluje shodu
    cb: body => {
      return body.pass == body.passRepeat
    }
  }
}

module.exports = class User {

  getUserFields(){
    return inputFields;
  }

  setNewUserData(body,customFields = false){
    let userFields = inputFields
    if(customFields) userFields = customFields


    for (const field in userFields) {

      if(typeof(body[field]) != 'string'){
        return {
          err: true,
          field: field,
          type: 'empty'
        }
      }

      if(userFields[field].min){
        if(body[field].length < userFields[field].min){
          return {
            err: true,
            field: field,
            type: 'short'
          }
        }
      }

      if(userFields[field].max){
        if(body[field].length > userFields[field].max){
          return {
            err: true,
            field: field,
            type: 'long'
          }
        }
      }

      if(userFields[field].patt){
        if(!userFields[field].patt.test(body[field])){
          return {
            err: true,
            field: field,
            type: 'wrongChars'
          }
        }
      }

      if(userFields[field].cb){
        if(!userFields[field].cb(body)){
          return {
            err: true,
            field: field,
            type: 'passConfirm'
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
        code: 500,
      }
    }

    return {
      code: false
    }

  }

  async findUser(query){
    let user;
    try {
      user = await db.asyncFindOne(query)
    } catch(err) {
      return {
        code: 500,
      }
    }
    this.record = user;
    return {
      code: false,
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
        code: 500,
      }
    }
    //Šifruje žeton pomocí JWT
    const generated = jwt.sign({
      userId: this.record._id,
      userToken: newToken.key
    }, jwtKey)

    return {
      code: false,
      jwt: generated
    }
  }

  async validUserToken(req){
    const token = req.cookies.sessionToken
    if(!token){
      return {
        code: 401
      }
    }
    let verifed;
    try {
      verifed = await jwt.verify(token,jwtKey);
    } catch {
      return {
        code: 401
      }
    }

    const found = await this.findUser({ _id: verifed.userId });
    if(found.code){
      return {
        code: found.code
      }
    }

    if(!this.record){
      return {
        code: 404
      }
    }

    for(const i in this.record.tokens){
      if(this.record.tokens[i].key == verifed.userToken){
        this.activeToken = this.record.tokens[i];
        return {
          code: false,
          user: this.record
        }
      }
    }

    return {
      code: 401
    }

  }

  async removeUserToken(){
    //console.log(this.record.tokens);
    const newArray = this.record.tokens.filter(token => token.key != this.activeToken.key)

    try {
      await db.asyncUpdate({ _id: this.record._id }, { $set: { tokens: newArray } });
    } catch(err) {
      return {
        code: 500
      }
    }

    return {
      code: false,
    }

  }


  validUserQuery(params){
    const keys = ['fname','sname','email'];
    const patt = /^[A-Ža-ž0-9 ]+$/;
    const queryString = {}

    keys.forEach( i => {
      if(typeof(params[i]) == 'string' && params[i].length > 0 && patt.test(params[i])){
        queryString[i] = {$regex: new RegExp(params[i],'i')}
      }
    });

    if(params.isAdmin){
      queryString.isAdmin = (params.isAdmin == 'true')
    }

    return queryString;


  }

  async findUsers(query){
    let users;
    try {
      users = await db.asyncFind(query,{fname: 1,sname: 1,email: 1, isAdmin: 1})
    } catch(err) {
      return {
        code: 500
      }
    }
    this.records = users;
    return {
      code: false
    }

  }


  async setAdmin(value){
    try {
      await db.asyncUpdate({ _id: this.record._id }, { $set: { isAdmin: Boolean(value) } });
    } catch(err) {
      return {
        code: 500
      }
    }

    return {
      code: false,
    }

  }


  async deleteUser(){
    try {
      await db.asyncRemove({ _id: this.record._id });
    } catch(err) {
      return {
        code: 500
      }
    }

    return {
      code: false,
    }

  }

}
