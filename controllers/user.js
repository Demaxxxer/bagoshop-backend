const User = require('../models/user.js');
const bcrypt = require('bcrypt');

exports.create = async function(req,res){
  //Nová instance
  let user = new User();
  //Kontrole jestli už uživatel neni náhodou přihlášený
  await user.validUserToken(req)
  if(user.activeToken){
    res.status(403).json({err: 'Uživatel je už přihlášen'}).end();
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
  if(record.err){
    res.status(500).json({err: record.type}).end();
    return;
  }
  //Když je uživatel nalezen
  if (record.user){
    res.status(409).json({err: 'Uživatel s tímto emailem už existuje'}).end();
    return;
  }
  //Vytváři nového uživatele
  const created = await user.saveNewUser();
  if(created.err){
    res.status(500).json({err: created.type}).end();
    return;
  }
  //Maže instanci aby se uvolnila paměť
  delete user;

  res.status(201).json({err: 'Uživatel úspěšně vytvořen nyní se můžete přihlásit'}).end();
}

exports.login = async function(req,res){
  let user = new User();
  //Kontrole jestli už uživatel neni náhodou přihlášený
  await user.validUserToken(req)
  if(user.activeToken){
    res.status(403).json({err: 'Uživatel je už přihlášen'}).end();
    return;
  }
  //Upravení použitých polí
  user.fields = {
    email: user.fields.email,
    pass: user.fields.pass
  }
  //Validace polí
  const result = user.setNewUserData(req.body);
  if(result.err){
    res.status(400).json(result).end();
    return;
  }
  //Hledání uživatele se stejným emailem
  const record = await user.findUser({email: user.email});
  if(record.err){
    res.status(500).json({err: record.type}).end();
    return;
  }
  //Když uživatel neni nalezen
  if (!record.user){
    res.status(404).json({err: 'Uživatel s tímto emailem neexistuje'}).end();
    return;
  }
  //Když je špatné heslo
  if(!await bcrypt.compare(user.pass, record.user.pass)){
    res.status(401).json({err: 'Email a heslo se neshodují'}).end();
    return;
  }
  const ip = req.headers['x-client-ip'] || req.ip;

  const token = await user.createAccessToken(ip)
  if(token.err){
    res.status(500).json({err: token.type}).end();
    return;
  }

  res.cookie('sessionToken', token.jwt)
  const payload = user.getReturnInfo();
  payload.err = 'Uživatel úspěšně přihlášen'
  res.status(200).json(payload).end();
}

exports.loged = async function(req,res){
  let user = new User();

  const result = await user.validUserToken(req)
  if(result.err){
    res.status(401).json({err: result.type}).end();
    return;
  }

  res.status(200).json(user.getReturnInfo()).end()
}

exports.logout = async function(req,res){
  let user = new User();

  //Kontrola jestli je uživatele vůbec přihlášeny
  await user.validUserToken(req)
  if(!user.record){
    res.status(403).json({err: 'Uživatel neni přihlášeny'}).end();
    return;
  }

  const result = await user.removeUserToken();
  if(result.err){
    res.status(500).json({err: result.type}).end();
    return;
  }

  res.status(200).json({err: 'Uživatel odhlášen'}).end()
}

exports.get = async function(req,res){
  let user = new User();

  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).json({err: 'Uživatele neni administrátor'}).end();
    return;
  }

  const result = await user.findUsers({});
  if(result.err){
    res.status(500).json({err: result.type}).end();
    return;
  }

  res.status(200).json(user.records).end();
}

exports.setAdmin = async function(req,res){
  let user = new User();

  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).json({err: 'Uživatele neni administrátor'}).end();
    return;
  }

  //Hledání uživatele se stejným emailem
  const record = await user.findUser({_id: req.body.id});
  if(record.err){
    res.status(500).json({err: record.type}).end();
    return;
  }

  if(!user.record){
    res.status(404).json({err: 'Uživatel nenalezen'}).end();
  }

  const result = await user.setAdmin(req.body.value);
  if(result.err){
    res.status(500).json({err: result.type}).end();
  }

  res.status(200).json({err: 'Oprávnění uživatele upraveno'}).end();
}

exports.delete = async function(req,res){
  let user = new User();

  await user.validUserToken(req)
  if( !(user.record && user.record.isAdmin) ){
    res.status(403).json({err: 'Uživatele neni administrátor'}).end();
    return;
  }



}
