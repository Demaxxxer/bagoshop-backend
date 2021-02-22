const User = require('../models/user.js');
const bcrypt = require('bcrypt');

exports.create = async function(req,res){
  //Nová instance
  let user = new User();
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

  res.status(201).end();
}

exports.login = async function(req,res){
  let user = new User();
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
  res.status(200).end();
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
