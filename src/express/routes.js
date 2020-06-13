"use strict";
let {SensorHubUpdateSensor} = require("../SensorHubInterface.js");

const express = require('express');
const api = express.Router();

api.get('/', (req, res) => {
    console.log("GET - /")
    var output = []
    var connectedMacs = [...req.app.settings.sensorHub.ctx.connectedSensors]
    for (var i = 0; i < connectedMacs.length; i++) {
        for(var j = 0; j < req.app.settings.sensorHub.ctx.registeredSensors.length; j++) {
            if(connectedMacs[i] === req.app.settings.sensorHub.ctx.registeredSensors[j].macAddress) {
                output.push(req.app.settings.sensorHub.ctx.registeredSensors[j])
            }
        }
    }
    console.log("REPORTING CONNECTED SENSORS:")
    console.log(output)
    res.send({connectedSensors: output});
});

api.post('/info', (req, res) => {
    console.log("POST - /info")
    var macAddress = req.body.macAddress
    var newName = req.body.name
    var newNotification = req.body.notification
    if (macAddress && newName && newNotification) {
        console.log("REST API: sending update request to sensor hub")
        let name = req.app.settings.sensorHub.name
        req.app.settings.sensorHub.send(new SensorHubUpdateSensor(macAddress, newName, newNotification), name)
        res.send('ok')
    } else {
        res.status(400).send("request did not contain required data")
    }
});

module.exports = api;
