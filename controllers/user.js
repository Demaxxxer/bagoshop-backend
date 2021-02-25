const User = require('../models/user.js');
const bcrypt = require('bcrypt');

exports.create = async function(req,res){
  //Nová instance
  let user = new User();
  //Kontrole jestli už uživatel neni náhodou přihlášený
  await user.validUserToken(req)
  if(user.activeToken){
    res.status(403).end();
    return;
  }
  //Validace polí
  const result = user.setNewUserData(req.body);
  if(result.err){
    res.status(400).json(result).end();
    return;
  }
  //Hledání uživatele se stejným emailem
  const record = await user.findUser({email: user.email});
  if(record.code){
    res.status(record.code).end();
    return;
  }
  //Když je uživatel nalezen
  if (record.user){
    res.status(409).end();
    return;
  }
  //Vytváři nového uživatele
  const created = await user.saveNewUser();
  if(created.code){
    res.status(created.code).end();
    return;
  }
  //Maže instanci aby se uvolnila paměť
  delete user;

  res.status(201).end();
}

exports.login = async function(req,res){
  let user = new User();
  //Kontrole jestli už uživatel neni náhodou přihlášený
  await user.validUserToken(req)
  if(user.activeToken){
    res.status(403).end();
    return;
  }
  //Upravení použitých polí
  const allFields = user.getUserFields()
  newFields = {
    email: allFields.email,
    pass: allFields.pass
  }
  //Validace polí
  const result = user.setNewUserData(req.body, newFields);
  if(result.err){
    res.status(400).json(result).end();
    return;
  }
  //Hledání uživatele se stejným emailem
  const record = await user.findUser({email: user.email});
  if(record.code){
    res.status(record.code).end();
    return;
  }
  //Když uživatel neni nalezen
  if (!record.user){
    res.status(404).end();
    return;
  }
  //Když je špatné heslo
  if(!await bcrypt.compare(user.pass, record.user.pass)){
    res.status(401).end();
    return;
  }
  const ip = req.headers['x-client-ip'] || req.ip;

  const token = await user.createAccessToken(ip)
  if(token.code){
    res.status(token.code).end();
    return;
  }

  res.cookie('sessionToken', token.jwt)
  const payload = user.getReturnInfo();
  res.status(200).json(payload).end();
}

exports.loged = async function(req,res){
  let user = new User();

  const result = await user.validUserToken(req)
  if(result.code){
    res.status(result.code).end();
    return;
  }

  res.status(200).json(user.getReturnInfo()).end()
}

exports.logout = async function(req,res){
  let user = new User();

  //Kontrola jestli je uživatele vůbec přihlášeny
  await user.validUserToken(req)
  if(!user.record){
    res.status(403).end();
    return;
  }

  const result = await user.removeUserToken();
  if(result.code){
    res.status(result.code).end();
    return;
  }

  res.status(200).end()
}

exports.get = async function(req,res){
  let user = new User();

  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).end();
    return;
  }

  const search = user.validUserQuery(req.query)

  const result = await user.findUsers(search);

  if(result.code){
    res.status(result.code).end();
    return;
  }

  res.status(200).json(user.records).end();
}

exports.setAdmin = async function(req,res){
  let user = new User();

  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).end();
    return;
  }

  const record = await user.findUser({_id: req.body.id});
  if(record.code){
    res.status(record.code).end();
    return;
  }

  if(!user.record){
    res.status(404).end();
  }

  const result = await user.setAdmin(req.body.value);
  if(result.code){
    res.status(result.code).end();
  }

  res.status(200).end();
}

exports.delete = async function(req,res){
  let user = new User();

  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).end();
    return;
  }

  //Hledání uživatele se stejným emailem
  const record = await user.findUser({_id: req.body.id});
  if(record.code){
    res.status(record.code).end();
    return;
  }

  const result = user.deleteUser()
  if(result.code){
    res.status(result.code).end();
    return;
  }

  res.status(200).end();

}
