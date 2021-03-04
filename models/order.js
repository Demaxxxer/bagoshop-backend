const { AsyncNedb } = require('nedb-async')

const db = new AsyncNedb({ filename: './data/orders.db', autoload: true });

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
