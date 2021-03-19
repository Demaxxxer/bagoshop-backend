const Item = require('../models/item');
const User = require('../models/user');
const Order = require('../models/order');

exports.create = async function(req,res){
  let order = new Order();
  //Validace formátu košíku
  if(!order.validCart(req.cookies)){
    res.status(400).end();
    return;
  }

  let user = new User();
  //Upravení použitých polí
  const allFields = user.getUserFields()
  newFields = {
    firstname: allFields.firstname,
    surname: allFields.surname,
    email: allFields.email,
  }

  //Validace polí
  const result = user.setNewUserData(req.body, newFields);
  if(result.err){
    res.status(400).json(result).end();
    return;
  }
  if(order.payments.indexOf(req.body.payment) == -1){
    res.status(400).json({field: 'paymentMethod'}).end();
    return;
  }

  //Získává položky
  let item = new Item()
  const records = await item.findItems({ _id: { $in: order.ids }},0);
  if(records.code){
    res.status(records.code).end();
    return;
  }
  if(!item.records && item.records.length < 1){
    res.status(404).end();
    return;
  }

  //Skládání položek objednávky
  let content = [];
  let cost = 0;
  for (const i in item.records){
    const count = Math.abs(order.cartData[item.records[i]._id])

    await order.increaseSold(item.records[i],count);

    content.push({
      name: item.records[i].name,
      cost: item.records[i].cost * count,
      count: count
    })
    cost += item.records[i].cost * count

  }
  //Skládání informací u uživateli
  const details = {
    fname: user.firstname,
    sname: user.surname,
    email: user.email,
    payment: req.body.payment
  }

  const newOrder = {
    details,
    content,
    cost,
    createdAt: new Date(),
    user: 'noAccount'
  }

  await user.validUserToken(req)
  if(user.record){
    newOrder.user = user.record._id
  }

  const saved = await order.saveOrder(newOrder)
  if(saved.code){
    res.status(saved.code).end();
    return;
  }

  res.status(201).json(order.record).end();
}

exports.get = async function(req,res){

  let user = new User();
  await user.validUserToken(req)
  if( !(user.record) ){
    res.status(403).end();
    return;
  }

  let order = new Order();
  const result = await order.findOrder({user:user.record._id})
  if (result.code){
    res.status(result.code).end();
  }
  res.status(200).json(order.records).end();
}
