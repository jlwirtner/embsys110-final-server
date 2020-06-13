"use strict";
let {SensorHubUpdateSensor} = require("../SensorHubInterface.js");
//import Sensor from '../SensorHub.js';
let {fw, FW, log} = require('galliumstudio')
let {APP} = require('../App.js')

const express = require('express');
const api = express.Router();

class Sensor {
    constructor(macAddress, name = 'New Sensor', notification = 'New Sensor has been triggered!') {
        this.macAddress = macAddress
        this.name = name
        this.notification = notification
    }
}

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
    console.log(req.body)
    var macAddress = req.body.macAddress
    var newName = req.body.name
    var newNotification = req.body.notification
    if (macAddress && newName && newNotification) {
        // var sensors = req.app.settings.sensorHub.ctx.registeredSensors
        // console.log(sensors)
        // var index = sensors.findIndex(o => o.macAddress === macAddress)
        // console.log(index)
        // var updateInfo = {
        //     macAddress: macAddress,
        //     name: newName,
        //     notification: newNotification
        // }
        // var newSensor = new Sensor(macAddress, newName, newNotification)
        // req.app.settings.sensorHub.ctx.registeredSensors[index] = newSensor
        // console.log(req.app.settings.sensorHub.ctx.registeredSensors)
        console.log("sending update request to sensor hub")
        // console.log(updateInfo)
        let name = req.app.settings.sensorHub.name
        req.app.settings.sensorHub.send(new SensorHubUpdateSensor(macAddress, newName, newNotification), name)
        
        //fw.post(new SensorHubUpdateSensor(macAddress, newName, newNotification, APP.SENSOR_HUB))
        res.send('ok')
    } else {
        res.status(400).send("request did not contain required data")
    }
});

module.exports = api;
