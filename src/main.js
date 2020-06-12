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

let {fw, FW, log} = require('galliumstudio')
let {TcpSrv} = require("./TcpSrv.js")
let {TcpConn} = require("./TcpConn.js")
let {ApnSrv} = require("./ApnSrv.js")
let {SensorHub} = require("./SensorHub.js")
let {TcpSrvStartReq, TcpSrvStopReq} = require("./TcpSrvInterface.js")
let {TcpConnSendReq} = require("./TcpConnInterface.js")
let {ApnSrvStartReq} = require("./ApnSrvInterface.js")
let {SensorHubStartReq} = require("./SensorHubInterface.js")
let {app, APP} = require("./App.js")
const readline = require('readline')

let tcpSrv = new TcpSrv('TcpSrv')
let tcpConns = []
for (let i=0; i < APP.TCP_CONN_CNT; i++) {
    tcpConns.push(new TcpConn(app.tcpConn(i)))
}
tcpSrv.start()
tcpConns.forEach(conn => {
    conn.start()  
})
//log.onAll();
fw.post(new TcpSrvStartReq('TcpSrv'))

let apnSrv = new ApnSrv(APP.APN_SRV)
let sensorHub = new SensorHub(APP.SENSOR_HUB)

apnSrv.start()
sensorHub.start()

fw.post(new ApnSrvStartReq(APP.APN_SRV))
fw.post(new SensorHubStartReq(APP.SENSOR_HUB))

console.log('fingers crossed!')

/*
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
    console.log(str)
    if (str == '\u0003' ) {
        process.exit()
    }
    for (let i=0; i < APP.TCP_CONN_CNT; i++) {
        fw.post(new TcpConnSendReq(app.tcpConn(i), FW.UNDEF, 0, str))
    }
})
*/

let stdin = process.openStdin();
stdin.on('data', (str)=>{ 
    for (let i=0; i < APP.TCP_CONN_CNT; i++) {
        fw.post(new TcpConnSendReq(app.tcpConn(i), FW.UNDEF, 0, str + '\r'))
    }
});

// Start of my code

// var apn = require('apn');


// var options = {
//     token: {
//         key: "keys/AuthKey_4XA74FJH2G.p8",
//         keyId: "4XA74FJH2G",
//         teamId: "U2M6244D36"
//     },
//     producation: false
// };

// var apnProvider = new apn.Provider(options);

// let deviceToken = "8064a49d81e8bcfca229e6b7f56989e114d9af9e27c73dcdc0d58a5c6f3dbfc7";

// var note = new apn.Notification();

// note.expiry = Math.floor(Date.now() / 1000) + 3600;
// note.sound = "ping.aiff";
// note.alert = "Your cat is on the table!";
// note.payload = {'messageFrom': 'ShockSensor Backend'};
// note.topic = "jlwCode.ShockSensor";

// apnProvider.send(note, deviceToken).then((result) => {
//     console.log(result)
// })

// const exApp = require('./express/app.js');
// const config = require('./express/configDomain.js');


// exApp.listen(config.port, () => {
//     console.log(`API REST running in http://localhost:${config.port}`)
// })

// let options2 = {
//     multicast: true, // use udp multicasting
//     interface: '192.168.0.11', // explicitly specify a network interface. defaults to all
//     port: 5353, // set the udp port
//     ip: '224.0.0.251', // set the udp ip
//     ttl: 255, // set the multicast ttl
//     loopback: true, // receive your own packets
//     reuseAddr: true // set the reuseAddr option when creating the socket (requires node >=0.11.13)
// }

// var mdns = require('multicast-dns')([options2]);

// mdns.on('response', function(response) {
//     console.log('got a response packet:', response)
// })

// mdns.on('query', function(query) {
//     console.log('got a query packet:', query)
// })

// lets query for an A record for 'brunhilde.local'


// var bonjour = require('bonjour')([options2]);

// bonjour.publish({name: 'shocksensor', type: 'shocksensor', port: 60002, txt: {yo:"sup"}})


// mdns.query({
//     questions:[{
//         name: 'shocksensor',
//         type: 'A'
//     }]
// })