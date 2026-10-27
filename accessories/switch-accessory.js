'use strict';

const ms = require('ms');
const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusSwitchAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        if (typeof accessoryData.activeDuration !== 'undefined') {
                                this.activeDuration = ms(accessoryData.activeDuration);
                        }
                        this.isOn = false;
                        this.service = this.addService(new Service.Switch(this.name));
                        this.service.getCharacteristic(Characteristic.On).on('get', this.getOn.bind(this)).on('set', this.setOn.bind(this));
                }
                getOn(callback) {
                        this.client.receiveLevel(this.netId, message => {
                                this.isOn = message.level > 0;
                                callback(false, this.isOn ? 1 : 0);
                        }, 'getOn');
                }
                setOn(turnOn, callback, context) {
                        if (context === 'event') { return callback(); }
                        const wasOn = this.isOn;
                        this.isOn = (turnOn === 1) || (turnOn === true);
                        if (wasOn === this.isOn) { return callback(); }
                        if (turnOn) {
                                this.client.turnOn(this.netId, () => {
                                        if (this.activeDuration) {
                                                this.timeout = setTimeout(() => { this.isOn = false; this.client.turnOff(this.netId); }, this.activeDuration);
                                        }
                                        callback();
                                });
                        } else {
                                this.client.turnOff(this.netId, () => callback());
                        }
                        if (!turnOn && this.timeout) { clearTimeout(this.timeout); }
                }
                processClientData(err, message) {
                        if (!err) {
                                this.service.getCharacteristic(Characteristic.On).setValue((message.level > 0) ? 1 : 0, undefined, 'event');
                        }
                }
        }

        return CBusSwitchAccessory;
};
