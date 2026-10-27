'use strict';

const chalk = require('chalk');
const ms = require('ms');
const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusLightAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusDimmerAccessory extends _CBusLightAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        if (typeof accessoryData.rampDuration !== 'undefined') {
                                this.rampDuration = ms(accessoryData.rampDuration);
                                if (this.rampDuration > ms('17m')) {
                                        throw new Error('accessory \'' + this.name + '\' rampDuration exceeds maximum (17m)');
                                }
                        }
                        this.brightnessC10tic = this.service.getCharacteristic(Characteristic.Brightness);
                        this.brightnessC10tic.on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
                }
                getBrightness(callback) {
                        this.client.receiveLevel(this.netId, message => {
                                this._log(FILE_ID, 'getBrightness', 'returned ' + message.level + '%');
                                if (message.level) { this.brightness = message.level; }
                                callback(false, message.level);
                        }, 'getBrightness');
                }
                setBrightness(newLevel, callback, context) {
                        this.brightness = newLevel;
                        const wasOn = this.isOn;
                        this.isOn = (this.brightness > 0);
                        if (context === 'event') { return callback(); }
                        if (!wasOn && (newLevel === 0)) {
                                this._log(FILE_ID, 'setBrightness', chalk.green('swallowing 0%'));
                                return callback();
                        }
                        this._log(FILE_ID, 'setBrightness', 'changing level to ' + newLevel + '%');
                        this.client.setLevel(this.netId, newLevel, () => callback(), this.rampDuration / 1000, 'setBrightness');
                }
                processClientData(err, message) {
                        if (!err) {
                                const level = message.level;
                                this.onC10tic.setValue((level > 0) ? 1 : 0, undefined, 'event');
                                if (level > 0) { this.brightnessC10tic.setValue(level, undefined, 'event'); }
                        }
                }
        }

        return CBusDimmerAccessory;
};
