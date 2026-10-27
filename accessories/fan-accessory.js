'use strict';

const chalk = require('chalk');
const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusFanAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        this.service = this.addService(new Service.Fan(this.name));
                        this.onC10tic = this.service.getCharacteristic(Characteristic.On);
                        this.speedC10tic = this.service.getCharacteristic(Characteristic.RotationSpeed);
                        this.onC10tic.on('get', this.getOn.bind(this)).on('set', this.setOn.bind(this));
                        this.speedC10tic.on('get', this.getSpeed.bind(this)).on('set', this.setSpeed.bind(this));
                        this.isOn = false;
                        this.speed = 0;
                        setTimeout(() => {
                                this.getSpeed((err, speed) => {
                                        if (!err) {
                                                this.isOn = (speed > 0); this.speed = speed;
                                                this.onC10tic.setValue(this.isOn ? 1 : 0, undefined, 'event');
                                                this.speedC10tic.setValue(this.speed, undefined, 'event');
                                        }
                                });
                        }, 3000);
                }
                getOn(callback) {
                        this.client.receiveLevel(this.netId, message => {
                                this.isOn = (message.level > 0);
                                if (this.isOn) { this.speed = message.level; }
                                callback(false, this.isOn ? 1 : 0);
                        }, 'getOn');
                }
                setOn(turnOn, callback, context) {
                        setTimeout(() => {
                                const wasOn = this.isOn;
                                this.isOn = (turnOn === 1) || (turnOn === true);
                                if (context === 'event') { return callback(); }
                                if (wasOn === this.isOn) { return callback(); }
                                const speed = turnOn ? this.speed : 0;
                                if (this.isOn && speed === 0) { return callback(); }
                                this.client.setLevel(this.netId, speed, () => callback(), 0, 'setOn');
                        }, 50);
                }
                getSpeed(callback) {
                        this.client.receiveLevel(this.netId, message => {
                                const speed = message.level;
                                this.isOn = (speed > 0);
                                if (speed > 0) { this.speed = speed; }
                                if (callback) { callback(false, this.speed); }
                        }, 'getSpeed');
                }
                setSpeed(newSpeed, callback, context) {
                        this.speed = newSpeed;
                        const wasOn = this.isOn;
                        this.isOn = (newSpeed > 0);
                        if (context === 'event') { return callback(); }
                        if (!wasOn && (newSpeed === 0)) { return callback(); }
                        this.client.setLevel(this.netId, newSpeed, () => callback(), 0, 'setSpeed');
                }
                processClientData(err, message) {
                        if (!err) {
                                const speed = message.level;
                                this.onC10tic.setValue((speed > 0) ? 1 : 0, undefined, 'event');
                                if (speed > 0) { this.speedC10tic.setValue(speed, undefined, 'event'); }
                        }
                }
        }

        return CBusFanAccessory;
};
