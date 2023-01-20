const express = require('express');
const router = express.Router();
const { check } = require("express-validator");
const { login } = require('../controllers/auth');

router.route('/login').post(
  check("email", "Please enter email").not().isEmpty(),
  check("password", "Please enter password").not().isEmpty(),
  login
);

module.exports = router;