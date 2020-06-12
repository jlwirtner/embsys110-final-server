"use strict";

const express = require('express');
const app = express();
const routes = require('./routes.js');

app.use('/', routes);

module.exports = app;
