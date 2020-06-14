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

let {Evt, ErrorEvt, fw, FW, Hsm, Timer, log} = require('galliumstudio')
let {TcpSrvStartReq, TcpSrvStartCfm, TcpSrvStopReq, TcpSrvStopCfm} = require("./TcpSrvInterface.js")
let {TcpConnStartReq, TcpConnStartCfm, TcpConnStopReq, TcpConnStopCfm, TcpConnUseReq, TcpConnUseCfm,
    TcpConnDoneInd } = require("./TcpConnInterface.js")
let {ApnSrvStartCfm} = require("./ApnSrvInterface.js")
let {app, APP} = require("./App.js")
let net = require('net')

var apn = require('apn');

var options = {
    token: {
        key: "keys/AuthKey_4XA74FJH2G.p8",
        keyId: "4XA74FJH2G",
        teamId: "U2M6244D36"
    },
    producation: false
};

const STARTING_TIMEOUT_MS = 100
const STOPPING_TIMEOUT_MS = 100

class ApnSrv extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),
            provider: null,
        }
        let config = {
            initial: 'stopped',
            on: { 
                ApnSrvStartReq: {
                    actions: (ctx, e)=> { 
                        this.event(e)
                        this.sendCfm(new ApnSrvStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                ApnSrvStopReq: {
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
                    },
                    on: { 
                        ApnSrvStopReq: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new ApnSrvStopCfm(), e)
                            }
                        },
                        ApnSrvStartReq: {
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
                        ctx.provider = new apn.Provider(options)
                        this.raise(new Evt('Done'))
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
                                this.sendCfm(new ApnSrvStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new ApnSrvStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        ApnSrvSendPushNotification: {
                            actions: (ctx,e)=> {
                                this.event(e)
                                this.defer(e)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new ApnSrvStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
                            }
                        },
                    },
                }, 
                stopping: {
                    onEntry: (ctx, e)=>{ 
                        this.state('stopping') 
                        ctx.stoppingTimer.start(STOPPING_TIMEOUT_MS)
                        ctx.provider.shutdown()
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
                                this.sendCfm(new ApnSrvStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        ApnSrvStopReq: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                this.defer(e)
                            }
                        }
                    },                    
                },
                started: {
                    onEntry: (ctx, e)=>{ 
                        this.state('started')
                    },
                    on: { 
                        ApnSrvSendPushNotification: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                console.log(e)
                          
                                var note = new apn.Notification();
                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                note.sound = "ping.aiff";
                                note.alert = e.notification;
                                note.payload = {'messageFrom': 'ShockSensor Backend'};
                                note.topic = "jlwCode.ShockSensor";

                                ctx.provider.send(note, e.deviceId).then((result) => {
                                    console.log(result)
                                })
                            }
                        }
                    }
                }                               
            }
        }
        super(name, ctx, config)
        this.ctx = ctx        
    }

    // Helper function to iterate over all nodes.
    forAllNodes(action) {
        for (let [nodeId, connSts] of this.ctx.nodeMap) {
            action(nodeId, connSts)
        } 
    }
}

module.exports = {
    ApnSrv
 }
