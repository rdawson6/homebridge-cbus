'use strict';

const chalk = require('chalk');
const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusLightAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        this.isOn = false;
                        this.brightness = 100;
                        this.rampDuration = 0;
                        this.service = this.addService(new Service.Lightbulb(this.name));
                        this.onC10tic = this.service.getCharacteristic(Characteristic.On);
                        this.onC10tic.on('get', this.getOn.bind(this)).on('set', this.setOn.bind(this));
                }
                getOn(callback) {
                        this.client.receiveLevel(this.netId, message => {
                                this.isOn = (message.level > 0);
                                this._log(FILE_ID, 'getOn', 'receiveLevel returned ' + message.level);
                                callback(false, this.isOn ? 1 : 0);
                        }, 'getOn');
                }
                setOn(turnOn, callback, context) {
                        setTimeout(() => {
                                const wasOn = this.isOn;
                                this.isOn = (turnOn === 1) || (turnOn === true);
                                if (context === 'event') { return callback(); }
                                if (this.isOn === wasOn) {
                                        this._log(FILE_ID, 'setOn', 'no state change from ' + wasOn);
                                        return callback();
                                }
                                const newLevel = turnOn ? this.brightness : 0;
                                const reason = turnOn ? ((this.brightness === 100) ? 'on' : 'restore') : 'off';
                                this._log(FILE_ID, 'setOn', 'changing level to ' + newLevel + '%');
                                this.client.setLevel(this.netId, newLevel, () => callback(), this.rampDuration / 1000, 'setOn (' + reason + ')');
                        }, 50);
                }
                processClientData(err, message) {
                        if (!err) {
                                this.onC10tic.setValue((message.level > 0) ? 1 : 0, undefined, 'event');
                        }
                }
        }

        return CBusLightAccessory;
};
