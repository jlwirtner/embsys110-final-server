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
let {app, APP} = require("./App.js")
let net = require('net')

// Application constants.
const TCP_PORT = 60002

// Timeout periods.
const STARTING_TIMEOUT_MS = 500
const STOPPING_TIMEOUT_MS = 500

// Internal events
class Fail extends ErrorEvt {
    constructor(error = FW.ERROR_UNSPEC, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('Fail', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class TcpConnected extends Evt {
    constructor(to, sock) {
        super('TcpConnected', to)
        this.sock = sock 
    }
}

// Helper functions
function arrayMove(from, to, item) {
    let idx = from.indexOf(item)
    fw.assert(idx >= 0)
    from.splice(idx, 1)
    fw.assert(to.indexOf(item) == -1)
    to.push(item);
}

class TcpSrv extends Hsm {
    constructor(name) {
        let ctx = {
            savedStartReq: null,
            savedStopReq: null,
            startingTimer: new Timer(name, "StartingTimer"),
            stoppingTimer: new Timer(name, "StoppingTimer"),

            tcpServer: null,

            // Objects containing free, pending and busy lists.
            tcpConnList: null
        }
        let config = {
            initial: 'stopped',
            on: { 
                TcpSrvStartReq: {
                    actions: (ctx, e)=> { 
                        this.event(e)
                        this.sendCfm(new TcpSrvStartCfm(FW.ERROR_STATE, this.name), e)
                    }
                },
                TcpSrvStopReq: {
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
                        ctx.tcpConnList = {
                            free: [],
                            busy: []
                        }
                    },
                    on: { 
                        TcpSrvStopReq: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new TcpSrvStopCfm(), e)
                            }
                        },
                        TcpSrvStartReq: {
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
                        for (let i=0; i<APP.TCP_CONN_CNT; i++) {
                            this.sendReq(new TcpConnStartReq(), app.tcpConn(i))
                        }
                    },
                    onExit: (ctx, e)=>{ 
                        ctx.startingTimer.stop()
                    },
                    on: { 
                        StartingTimer: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new TcpSrvStartCfm(FW.ERROR_TIMEOUT, this.name), ctx.savedStartReq)
                            }
                        },
                        Fail: {
                            target: 'stopping',
                            actions: (ctx, e)=> { 
                                this.event(e)
                                this.sendCfm(new TcpSrvStartCfm(e.error, e.origin, e.reason), ctx.savedStartReq)
                            }
                        },
                        Done: {
                            target: 'started',
                            actions: (ctx, e)=> { 
                                this.sendCfm(new TcpSrvStartCfm(FW.ERROR_SUCCESS), ctx.savedStartReq)
                            }
                        },
                        TcpConnStartCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{
                                this.event(e)
                                if (e.error !== FW.ERROR_SUCCESS) {
                                    this.raise(new Fail(e.error, e.origin, e.reason))
                                } else {
                                    if (this.clearSeq(e)) {
                                        this.raise(new Evt('Done'))
                                    }
                                    ctx.tcpConnList.free.push(e.from)
                                }
                            }
                        }
                    },
                }, 
                stopping: {
                    onEntry: (ctx, e)=>{ 
                        this.state('stopping') 
                        ctx.stoppingTimer.start(STOPPING_TIMEOUT_MS)
                        for (let i=0; i<APP.TCP_CONN_CNT; i++) {
                            this.sendReq(new TcpConnStopReq(), app.tcpConn(i))
                        }
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
                                this.sendCfm(new TcpSrvStopCfm(FW.ERROR_SUCCESS), ctx.savedStopReq)
                            }
                        },
                        TcpConnStopCfm: {
                            cond: (ctx, e)=>this.matchSeq(e),
                            actions: (ctx, e)=>{
                                this.event(e)
                                if (e.error !== FW.ERROR_SUCCESS) {
                                    this.raise(new Fail(e.error, e.origin, e.reason))
                                } else {
                                    if (this.clearSeq(e)) {
                                        this.raise(new Evt('Done'))
                                    }
                                }
                            }
                        },
                        TcpSrvStopReq: {
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

                        ctx.tcpServer = net.createServer()
                        ctx.tcpServer.listen(TCP_PORT)
                        ctx.tcpServer.on('connection', (sock)=>{
                            // Note there seems no way to get the headers['x-forwarded-for'] to find out the real IP address.
                            this.log(`tcp socket connected`)
                            this.send(new TcpConnected(this.name, sock))
                        })
                    },
                    on: { 
                        TcpConnected: {
                            actions: (ctx, e)=> { 
                                this.event(e)
                                if (ctx.tcpConnList.free.length == 0) {
                                    this.error('No tcpConn availabled. Rejected')
                                    e.sock.close()
                                } else {
                                    let tcpConn = ctx.tcpConnList.free.shift()
                                    ctx.tcpConnList.busy.push(tcpConn)
                                    this.log(`Using ${tcpConn} for tcp connection`)
                                    this.log(`busy tcpConn = ${ctx.tcpConnList.busy}`)
                                    this.sendReq(new TcpConnUseReq(e.sock), tcpConn)
                                }
                            }
                        },
                        TcpConnDoneInd: {
                            actions: (ctx, e)=>{
                                this.event(e)
                                arrayMove(ctx.tcpConnList.busy, ctx.tcpConnList.free, e.from)
                                this.log(`busy tcpConn = ${ctx.tcpConnList.busy}`)
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
    TcpSrv
 }