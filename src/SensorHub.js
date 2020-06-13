/*******************************************************************************
 * Copyright (C) Gallium Studio LLC. All rights reserved.
 *
 * This program is open source software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Alternatively, this program may be distributed and modified under the
 * terms of Gallium Studio LLC commercial licenses, which expressly supersede
 * the GNU General Public License and are specifically designed for licensees
 * interested in retaining the proprietary status of their code.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * Contact information:
 * Website - https://www.galliumstudio.com
 * Source repository - https://github.com/galliumstudio
 * Email - admin@galliumstudio.com
 ******************************************************************************/

let {Evt, ErrorEvt, Msg, fw, FW, Hsm, Timer, BufReader, BufWriter} = require('galliumstudio')
let {SensorHubStartReq, SensorHubStartCfm, SensorHubStopReq, SensorHubStopCfm} = require("./SensorHubInterface.js")  
let {ApnSrvSendPushNotification} = require("./ApnSrvInterface.js")
let {APP} = require("./App.js")
let net = require('net')
var ref = require('ref')
var StructType = require('ref-struct')

const STARTING_TIMEOUT_MS = 100
const STOPPING_TIMEOUT_MS = 100

const exApp = require('./express/app.js');
const config = require('./express/configDomain.js');

let bonjourOptions = {
    multicast: true, // use udp multicasting
    interface: '192.168.0.11', // explicitly specify a network interface. defaults to all
    port: 5353, // set the udp port
    ip: '224.0.0.251', // set the udp ip
    ttl: 255, // set the multicast ttl
    loopback: true, // receive your own packets
    reuseAddr: true // set the reuseAddr option when creating the socket (requires node >=0.11.13)
}

var bonjour = require('bonjour')([bonjourOptions]);

class Sensor {
    constructor(macAddress, name = 'New Sensor', notification = 'New Sensor has been triggered!') {
        this.macAddress = macAddress
        this.name = name
        this.notification = notification
    }
}

class SensorHub extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            connectedSensors: null,
            registeredSensors: null,
            deviceId: "8064a49d81e8bcfca229e6b7f56989e114d9af9e27c73dcdc0d58a5c6f3dbfc7",
        }
        let config = {
            initial: 'stopped',
            on: { 
                SensorHubStartReq: {
                    actions: (ctx, e)=> { 
                        this.event(e)
                        this.sendCfm(new SensorHubStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                SensorHubStopReq: {
                    target: 'stopping',
                    actions: (ctx, e)=>{
                        this.event(e)
                        ctx.savedStopReq = e
                    }
                }
            },
            states: {
                stopped: {
                    onEntry: (ctx, e)=>{ 
                        this.state('stopped')
                        ctx.registeredSensors = []
                        ctx.connectedSensors = new Set()
                    },
                    on: { 
                        SensorHubStopReq: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new SensorHubStopCfm(), e)
                            }
                        },
                        SensorHubStartReq: {
                            target: 'starting',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                ctx.savedStartReq = e
                            }
                        }
                    },
                },
                starting: {
                    onEntry: (ctx, e)=>{ 
                        this.state('starting')
                        ctx.startingTimer.start(STARTING_TIMEOUT_MS)
                        // @todo Initialization of deviceId, connectedSensors, and registeredSensors
                        this.startRestApi()
                        this.startBonjour()
                        //this.raise(new Evt('Done'))
                    },
                    onExit: (ctx, e)=>{ 
                        ctx.startingTimer.stop()
                        this.recall()
                    },
                    on: { 
                        StartingTimer: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new SensorHubStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new SensorHubStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        SensorHubSensorConnection: {
                            actions: (ctx,e)=> {
                                this.event(e)
                                this.defer(e)
                            }
                        },
                        SensorHubSensorShockEvent: {
                            actions: (ctx,e)=> {
                                this.event(e)
                                this.defer(e)
                            }
                        },
                        RestApiStarted: {
                            actions: (ctx,e)=> {
                                this.event(e)
                                this.raise(new Evt('Done'))
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new SensorHubStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
                            }
                        }
                    },
                }, 
                stopping: {
                    onEntry: (ctx, e)=>{ 
                        this.state('stopping') 
                        ctx.stoppingTimer.start(STOPPING_TIMEOUT_MS)
                        this.raise(new Evt('Done'))
                    },
                    onExit: (ctx, e)=>{ 
                        ctx.stoppingTimer.stop()
                        this.recall()
                    },
                    on: { 
                        StoppingTimer: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                fw.assert(0)
                            }
                        },
                        Fail: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                fw.assert(0)
                            }
                        },
                        Done: {
                            target: 'stopped',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new SensorHubStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        SensorHubStopReq: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },                    
                started: {
                    initial: 'notReadyToNotify',
                    onEntry: (ctx, e)=>{ this.state('started') },
                    on: {
                        SensorHubSensorConnection: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                let alreadyRegistered = ctx.registeredSensors.some(sensor => sensor.macAddress === e.macAddress)
                                if(!alreadyRegistered) {
                                    ctx.registeredSensors.push(new Sensor(e.macAddress))
                                }
                                ctx.connectedSensors.add(e.macAddress)
                                this.raise(new Evt('SensorConnected'))
                            }
                        },
                        SensorHubSensorDisconnect: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                ctx.connectedSensors.delete(e.macAddress)
                            }
                        },
                        SensorHubUpdateSensor: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                let macAddress = e.macAddress
                                let newName = e.name
                                let newNotification = e.notification
                                let sensors = ctx.registeredSensors
                                let index = sensors.findIndex(o => o.macAddress === macAddress)
                                let newSensor = new Sensor(macAddress, newName, newNotification)
                                this.log("Updating sensor info")
                                this.log("old:", sensors[index])
                                this.log("new:", newSensor)
                                ctx.registeredSensors[index] = newSensor
                            }
                        },
                        SensorHubUpdateDevice: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                ctx.deviceId = e.deviceId
                                this.raise(new Evt('DeviceConnected'))
                            }
                        }
                    },
                    states: {
                        notReadyToNotify: {
                            onEntry: (ctx, e)=>{
                                this.state('notReadyToNotify')
                                this.event(e)
                                if(ctx.connectedSensors.size > 0 && ctx.deviceId !== null) {
                                    this.raise(new Evt('Ready'))
                                }
                            },
                            on: { 
                                Ready: {
                                    target: 'readyToNotify',
                                    actions: (ctx, e)=> { 
                                        this.event(e)
                                    }
                                },
                                DeviceConnected: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        if(ctx.connectedSensors.size > 0 && ctx.deviceId !== null) {
                                            this.raise(new Evt('Ready'))
                                        }
                                    }
                                },
                                SensorConnected: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        if(ctx.connectedSensors.size > 0 && ctx.deviceId !== null) {
                                            this.raise(new Evt('Ready'))
                                        }
                                    }
                                }
                            },
                        },
                        readyToNotify: {
                            onEntry: (ctx, e)=>{
                                this.state('readyToNotify')
                                this.event(e)
                            },
                            on: {
                                SensorHubSensorShockEvent: {
                                    actions: (ctx, e)=> {
                                        this.event(e)
                                        let sensor = ctx.registeredSensors.filter(sensor => sensor.macAddress = e.macAddress)
                                        let message = sensor[0].notification
                                        this.send(new ApnSrvSendPushNotification(ctx.deviceId, message), APP.APN_SRV)
                                    }
                                }
                            }
                        }
                    }
                },                                  
            }
        }
        super(name, ctx, config)
        this.ctx = ctx
    }
    // Member functions (prototype)
    write(msg) {
        this.log('write: ', msg)
        this.ctx.sock.write(msg)
    }

    startRestApi() {
        console.log("Starting REST API...")
        exApp.set('sensorHub', this)
        exApp.set('sensorHubRaise', this.raise)
        exApp.listen(config.port, () => {
            console.log(`API REST running in http://localhost:${config.port}`)
            //console.log(hsm)
            console.log(exApp.settings.sensorHub)
            this.send(new Evt('RestApiStarted'), this.name)
        })
    }

    startBonjour() {
        console.log("Starting Bonjour...")
        bonjour.publish({name: 'shocksensor', type: 'shocksensor', port: 60002, txt: {yo:"sup"}})
    }
}

module.exports = {
    Sensor,
    SensorHub,
 }
