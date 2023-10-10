const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });  // the first param is the corresponding file name in the `views`
});

module.exports = router;
