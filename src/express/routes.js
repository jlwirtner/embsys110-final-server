"use strict";

const express = require('express');
const api = express.Router();
// const app = require('./app.js')

api.get('/', (req, res) => {
    console.log(req.app.settings.sensorHub.ctx.connectedSensors);
    res.send({connectedSensors: [...req.app.settings.sensorHub.ctx.connectedSensors]});
});

module.exports = api;
