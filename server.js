const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const path = require('path');
const helmet = require("helmet");
const router = require('./router.js');

const port = 8080;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieParser());
app.use('/', router);

app.use('/', express.static('public'));

app.use('/api/uploads/', express.static('uploads'));

/* Errory jsou zachyceny zde */
app.use((req, res, next) => {
  res.status(404);
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500);
});


app.listen(port, () => {
  console.log(`Valí na portu: ${port}`)
})
