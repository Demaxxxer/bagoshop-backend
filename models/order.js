const { AsyncNedb } = require('nedb-async')
const Item = require('./item.js')

const db = new AsyncNedb({ filename: './data/orders.db', autoload: true });
const item = new Item();
const itemDb = item.itemDb;
//const itemDb = new AsyncNedb({ filename: './data/items.db', autoload: true });


module.exports = class Order {

  payments = [
    'karta',
    'paypal',
    'paysafe',
    'bitcoin'
  ]

  validCart(cookies){
    if(cookies && cookies.cart && cookies.cart.length != 0){
      try {
        this.cartData = JSON.parse(cookies.cart);
        this.ids = Object.keys(this.cartData)
        if(!Array.isArray(this.ids)){
          return false;
        }
      } catch(err) {
        return false;
      }
      for(const i in this.ids){
        if(isNaN(this.cartData[this.ids[i]])){
          return false;
        }
      }
      return true;
    }
    return false;
  }

  async increaseSold(item,count){
    try {
      const result = await itemDb.asyncUpdate({_id:item._id},{$set: {sold: item.sold + count}});
    } catch (err) {
      console.log(err);
      return {
        code: 500,
      }
    }
  }

  async saveOrder(order){
    let record;
    try {
      record = await db.asyncInsert(order);
    } catch (err) {
      return {
        code: 500,
      }
    }
    this.record = record;

    return {
      code: false,
    }
  }

  async findOrder(query){
    let records;
    try {
      records = await db.asyncFind(query);
    } catch (err) {
      return {
        code: 500,
      }
    }
    this.records = records;

    return {
      code: false,
    }
  }

}
