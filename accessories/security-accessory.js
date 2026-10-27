'use strict';

const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusSecurityAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        this.service = this.addService(new Service.MotionSensor(this.name));
                        this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getMotionState.bind(this));
                }
                getMotionState(callback) {
                        this.client.receiveSecurityStatus(this.id, message => {
                                let detected;
                                if (['zone_unsealed', 'zone_open', 'zone_short'].includes(message.zonestate)) { detected = 1; }
                                else if (message.zonestate === 'zone_sealed') { detected = 0; }
                                this._log(FILE_ID, 'getMotionState', message.zonestate + ' => ' + detected);
                                callback(false, detected);
                        }, 'getMotionState');
                }
                processClientData(err, message) {
                        if (!err) {
                                this.service.getCharacteristic(Characteristic.MotionDetected).setValue((message.level > 0) ? 1 : 0);
                        }
                }
        }

        return CBusSecurityAccessory;
};
