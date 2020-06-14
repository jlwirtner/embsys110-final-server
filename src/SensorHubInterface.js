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

let {Evt, ErrorEvt, FW} = require('galliumstudio')

class SensorHubStartReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubStartReq', to, from, seq)
    }
}

class SensorHubStartCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('SensorHubStartCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class SensorHubStopReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubStopReq', to, from, seq)
    }
}

class SensorHubStopCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('SensorHubStopCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class SensorHubSensorConnection extends Evt {
    constructor(macAddress, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubSensorConnection', to, from, seq)
        this.macAddress = macAddress
    }
}

class SensorHubSensorDisconnect extends Evt {
    constructor(macAddress, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubSensorDisconnect', to, from, seq)
        this.macAddress = macAddress
    }
}

class SensorHubSensorShockEvent extends Evt {
    constructor(macAddress, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubSensorShockEvent', to, from, seq)
        this.macAddress = macAddress
    }
}

class SensorHubSensorTestEvent extends Evt {
    constructor(macAddress, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubSensorTestEvent', to, from, seq)
        this.macAddress = macAddress
    }
}

class SensorHubUpdateSensor extends Evt {
    constructor(macAddress, name, notification, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubUpdateSensor', to, from, seq)
        this.macAddress = macAddress
        this.name = name
        this.notification = notification
    }
}

class SensorHubSensorResetReq extends Evt {
    constructor(macAddress, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubSensorResetReq', to, from, seq)
        this.macAddress = macAddress
    }
}

class SensorHubUpdateDevice extends Evt {
    constructor(deviceId, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubUpdateDevice', to, from, seq)
        this.deviceId = deviceId
    }
}

class SensorHubRemoveDevice extends Evt {
    constructor(deviceId, to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('SensorHubRemoveDevice', to, from, seq)
        this.deviceId = deviceId
    }
}

module.exports = {
    SensorHubStartReq,
    SensorHubStartCfm,
    SensorHubStopReq,
    SensorHubStopCfm,
    SensorHubSensorConnection,
    SensorHubSensorDisconnect,
    SensorHubSensorShockEvent,
    SensorHubSensorTestEvent,
    SensorHubUpdateSensor,
    SensorHubSensorResetReq,
    SensorHubUpdateDevice,
    SensorHubRemoveDevice
 }
