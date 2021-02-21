const express = require('express');

const router = require('./router.js');

const port = 8080;
const app = express();


app.use(express.static('public'));
app.use(express.urlencoded({extended: true}))
app.use('/', router);


/* Errory jsou zachyceny zde */
app.use((req, res, next) => {
  res.status(404);
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500);
});


app.listen(port, () => {
  /*
  console.log(`Valí na portu: ${port}`)
  */
})
