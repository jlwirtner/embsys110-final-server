"use strict";

const express = require('express');
const app = express();
const routes = require('./routes.js');
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', routes);

module.exports = app;
