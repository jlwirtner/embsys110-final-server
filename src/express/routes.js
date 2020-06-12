"use strict";
let {SensorHubUpdateSensor} = require("../SensorHubInterface.js");
let {fw, FW, log} = require('galliumstudio')
let {APP} = require('../App.js')

const express = require('express');
const api = express.Router();

api.get('/', (req, res) => {
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
    var macAddress = req.body.macAddress
    var newName = req.body.macAddress
    var newNotification = req.body.notification
    if (macAddress && newName && newNotification) {
        var sensors = req.app.settings.sensorHub.ctx.registeredSensors
        var index = sensors.findIndex(o => o.macAddress === macAddress)
        var updateInfo = {
            macAddress,
            name: newName,
            notification: newNotification
        }
        req.app.settings.sensorHub.ctx.registeredSensors[index] = updateInfo
        console.log(req.app.settings.sensorHub.ctx.registeredSensors)
        console.log("sending update request to sensor hub")
        console.log(updateInfo)
        //req.app.settings.sensorHub.raise(new SensorHubUpdateSensor(macAddress, newName, newNotification))
        
        //fw.post(new SensorHubUpdateSensor(macAddress, newName, newNotification, APP.SENSOR_HUB))
        res.send('ok')
    } else {
        res.status(400).send("request did not contain required data")
    }
});

module.exports = api;
