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

class TcpConnStartReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('TcpConnStartReq', to, from, seq)
    }
}

class TcpConnStartCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('TcpConnStartCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class TcpConnStopReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0) {
        super('TcpConnStopReq', to, from, seq)
    }
}

class TcpConnStopCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('TcpConnStopCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class TcpConnUseReq extends Evt {
    constructor(sock) {
        super('TcpConnUseReq', FW.UNDEF, FW.UNDEF, 0)
        this.sock = sock
    }
}

class TcpConnUseCfm extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('TcpConnUseCfm', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class TcpConnDoneInd extends ErrorEvt {
    constructor(error = FW.ERROR_SUCCESS, origin = FW.UNDEF, reason = FW.REASON_UNSPEC) {
        super('TcpConnDoneInd', FW.UNDEF, FW.UNDEF, 0, error, origin, reason)
    }
}

class TcpConnSendReq extends Evt {
    constructor(to = FW.UNDEF, from = FW.UNDEF, seq = 0, data = null) {
        super('TcpConnSendReq', to, from, seq)
        this.data = data
    }
}

module.exports = {
    TcpConnStartReq,
    TcpConnStartCfm,
    TcpConnStopReq,
    TcpConnStopCfm,
    TcpConnUseReq,
    TcpConnUseCfm,
    TcpConnDoneInd,
    TcpConnSendReq,
 }