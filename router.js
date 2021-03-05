const express = require('express');
const router = express.Router();

const userMiddlewares = require('./controllers/user');
const itemMiddlewares = require('./controllers/item');
const orderMiddlewares = require('./controllers/order');

/*
router.get('/', (req, res) => {
  res.sendFile('index.html');
})
*/

router.post('/api/user/create', userMiddlewares.create);

router.post('/api/user/login', userMiddlewares.login);

router.get('/api/user/loged', userMiddlewares.loged);

router.post('/api/user/logout', userMiddlewares.logout);

router.get('/api/user/get', userMiddlewares.get);

router.patch('/api/user/admin', userMiddlewares.setAdmin);

router.delete('/api/user/delete', userMiddlewares.delete);


router.post('/api/item/create', itemMiddlewares.create);

router.get('/api/items/get', itemMiddlewares.getAll);

router.get('/api/items/fromcart', itemMiddlewares.getByCart);

router.get('/api/item/get', itemMiddlewares.get);

router.post('/api/item/update', itemMiddlewares.edit);

router.delete('/api/item/delete', itemMiddlewares.delete);


router.post('/api/order/create', orderMiddlewares.create);

router.get('/api/order/get', orderMiddlewares.get);



module.exports = router;
