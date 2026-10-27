'use strict';

const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusSmokeAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        this.service = this.addService(new Service.SmokeSensor(this.name));
                        this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getMotionState.bind(this));
                }
                getMotionState(callback) {
                        this.client.receiveLevel(this.netId, message => {
                                this._log(FILE_ID, 'getState', message.level);
                                callback(false, message.level ? 1 : 0);
                        });
                }
                processClientData(err, message) {
                        if (!err) {
                                this.service.getCharacteristic(Characteristic.SmokeDetected).setValue((message.level > 0) ? 1 : 0);
                        }
                }
        }

        return CBusSmokeAccessory;
};
