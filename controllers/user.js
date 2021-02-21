const User = require('../models/user.js');

exports.create = async function(req,res){
  let user = new User();
  const result = user.setNewUserData(req.body);
  if(result.err){
    res.status(400).json(result).end();
    return;
  }

  await user.saveNewUser();



  //delete user;
  res.status(201).end();
}
