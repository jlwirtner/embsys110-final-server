"use strict";

const express = require('express');
const api = express.Router();
// const app = require('./app.js')

api.get('/', (req, res) => {
    console.log(req.app.settings.sensorHub.ctx.connectedSensors);
    var output = []
    var connectedMacs = [...req.app.settings.sensorHub.ctx.connectedSensors]
    for (var i = 0; i < connectedMacs.length; i++) {
        for(var j = 0; j < req.app.settings.sensorHub.ctx.registeredSensors.length; j++) {
            if(connectedMacs[i] === req.app.settings.sensorHub.ctx.registeredSensors[j].macAddress) {
                output.push(req.app.settings.sensorHub.ctx.registeredSensors[j])
            }
        }
    }
    res.send({connectedSensors: output});
});

module.exports = api;
