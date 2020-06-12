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
let {TcpConnStartReq, TcpConnStartCfm, TcpConnStopReq, TcpConnStopCfm, TcpConnUseReq, TcpConnUseCfm, TcpConnDoneInd, TcpConnSendReq} = require("./TcpConnInterface.js")  
let {SensorHubSensorConnection, SensorHubSensorDisconnect, SensorHubSensorShockEvent} = require('./SensorHubInterface.js')
let {app, APP} = require("./App.js")
let net = require('net')
var ref = require('ref')
var StructType = require('ref-struct')

const STARTING_TIMEOUT_MS = 100
const STOPPING_TIMEOUT_MS = 100
const HEARTBEAT_TIMEOUT_MS = 30000
const SENSOR_CONNECTION_INDICATOR  = 'SENSOR-CONNECT'
const SENSOR_SHOCK_EVENT_INDICATOR = 'SENSOR-SHOCK-EVENT'
const SENSOR_HEARTBEAT_INDICATOR   = 'SENSOR-HEARTBEAT'

class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class MsgEvt extends Evt {
    constructor(type, msg) {
        super(type)
        this.msg = msg
    }
}
// Specific type of message events
class SockOnMessage extends MsgEvt {
    constructor(msg) { super('SockOnMessage', msg) }
}

function praseMacAddress(message) {
    let parts = message.split('**')
    if(parts.length < 2) {
        return ''
    }
    return parts[1]
}

class TcpConn extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            timoutTimer: new Timer(name, "TimeoutTimer"),
            user: null,
            sock: null,
            error: null,
            srvId: 'Srv',
            isSensorConnection: false,
            sensorMacAddress: null
        }
        let config = {
            initial: 'stopped',
            on: { 
                TcpConnStartReq: {
                    actions: (ctx, e)=> { 
                        this.event(e)
                        this.sendCfm(new TcpConnStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                TcpConnStopReq: {
                    target: 'stopping',
                    actions: (ctx, e)=>{
                        this.event(e)
                        ctx.savedStopReq = e
                    }
                }
            },
            states: {
                stopped: {
                    onEntry: (ctx, e)=>{ this.state('stopped') },
                    on: { 
                        TcpConnStopReq: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new TcpConnStopCfm(), e)
                            }
                        },
                        TcpConnStartReq: {
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
                        // @todo Initialization
                        this.raise(new Evt('Done'))
                    },
                    onExit: (ctx, e)=>{ 
                        ctx.startingTimer.stop()
                    },
                    on: { 
                        StartingTimer: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new TcpConnStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new TcpConnStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new TcpConnStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
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
                                this.sendCfm(new TcpConnStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        TcpConnStopReq: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },                    
                started: {
                    initial: 'idle',
                    onEntry: (ctx, e)=>{ this.state('started') },
                    states: {
                        idle: {
                            id: 'idle',
                            onEntry: (ctx, e)=>{ 
                                this.state('idle')
                                ctx.user = null
                                ctx.sock = null
                            },
                            on: { 
                                TcpConnUseReq: {
                                    target: 'connected',
                                    actions: (ctx, e)=> { 
                                        this.event(e)
                                        ctx.user = e.from
                                        ctx.sock = e.sock    
                                        this.sendCfm(new TcpConnUseCfm(FW.ERROR_SUCCESS), e)
                                    }
                                },
                            },
                        },
                        connected: {
                            onEntry: (ctx, e)=>{
                                this.state('connected')
                                ctx.error = null
                                ctx.sock.on('data', (msg)=>{
                                    this.log('sock received: ', msg)
                                    this.send(new SockOnMessage(msg), this.name)
                                })
                                ctx.sock.on('close', ()=>{
                                    this.log('sock closed')
                                    this.send(new Evt('SockOnClosed', this.name))
                                })
                                ctx.timoutTimer.start(HEARTBEAT_TIMEOUT_MS)
                            },
                            on: {
                                SockOnClosed: {
                                    actions: (ctx, e)=> {
                                        this.event(e)
                                        if(ctx.isSensorConnection) {
                                            this.send(new SensorHubSensorDisconnect(ctx.sensorMacAddress), APP.SENSOR_HUB)
                                            ctx.sensorMacAddress = null
                                            ctx.isSensorConnection = false
                                        }
                                        this.raise(new Evt('CloseSelf'))
                                        //this.sendInd(new TcpConnDoneInd(ctx.error || FW.ERROR_NETWORK, this.name, FW.REASON_UNSPEC), ctx.user)
                                    }
                                },
                                SockOnMessage: {
                                    actions: (ctx, e)=>{
                                        this.event(e)
                                        let message = e.msg.toString()
                                        this.log('SockOnMessage: ', message)

                                        if(message.includes(SENSOR_CONNECTION_INDICATOR)) {
                                            ctx.isSensorConnection = true
                                            ctx.sensorMacAddress = praseMacAddress(message)
                                            this.send(new SensorHubSensorConnection(ctx.sensorMacAddress), APP.SENSOR_HUB)
                                            this.raise(new TcpConnSendReq(this.name, this.name, 0, SENSOR_CONNECTION_INDICATOR + '\r'));
                                            //this.write(SENSOR_CONNECTION_INDICATOR);
                                        }
                                        if(message.includes(SENSOR_SHOCK_EVENT_INDICATOR)) {
                                            this.send(new SensorHubSensorShockEvent(ctx.sensorMacAddress), APP.SENSOR_HUB)
                                        }
                                        if(message.includes(SENSOR_HEARTBEAT_INDICATOR)) {
                                            ctx.timoutTimer.stop()
                                            ctx.timoutTimer.start(HEARTBEAT_TIMEOUT_MS)
                                        }
                                        // @todo Add processing here.
                                        this.write("Received OK.")
                                    }
                                },
                                TcpConnSendReq: {
                                    actions: (ctx, e)=> {
                                        this.event(e)
                                        this.log(`Sending ${e.data}`)
                                        this.write(e.data)
                                    }
                                },
                                TimeoutTimer: {
                                    actions: (ctx,e)=> {
                                        this.event(e)
                                        this.log("connection timed out - closing connection with sensor")
                                        ctx.sock.destroy()
                                        this.raise(new Evt('CloseSelf'))
                                    }
                                },
                                CloseSelf: {
                                    target: '#idle',
                                    actions: (ctx, e)=> {
                                        this.event(e)
                                        this.sendInd(new TcpConnDoneInd(ctx.error || FW.ERROR_NETWORK, this.name, FW.REASON_UNSPEC), ctx.user)
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
}

module.exports = {
    TcpConn
 }

