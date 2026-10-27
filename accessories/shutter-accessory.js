'use strict';

const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);
const SHUTTER_OPEN=100,SHUTTER_TOGGLE=98,SHUTTER_OPEN_TOGGLE=99,SHUTTER_DOWN=0,SHUTTER_CLOSE_TOGGLE=1,SHUTTER_STOP=2,SPIN_TIME=3000;

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusShutterAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        this.invert = accessoryData.invert || 'false';
                        this.cachedTargetPosition = 0;
                        setTimeout(() => {
                                this.client.receiveLevel(this.netId, message => {
                                        const t = this.translateShutterToProportional(message.level);
                                        this.cachedTargetPosition = (typeof t === 'undefined') ? 0 : t;
                                });
                        }, 5000);
                        this.service = this.addService(new Service.WindowCovering(this.name));
                        this.service.getCharacteristic(Characteristic.CurrentPosition).on('get', this.getCurrentPosition.bind(this));
                        this.service.getCharacteristic(Characteristic.TargetPosition).on('get', this.getTargetPosition.bind(this)).on('set', this.setTargetPosition.bind(this));
                        this.service.getCharacteristic(Characteristic.PositionState).on('get', this.getPositionState.bind(this));
                }
                translateProportionalToShutter(level) {
                        if (level > 100 || level < 0) { return 0; }
                        if (this.invert === 'true') { level = 100 - level; }
                        if (level <= 2) return 0;
                        if (level >= 98) return 100;
                        return level;
                }
                translateShutterToProportional(level) {
                        if (level > 100 || level < 0) { return undefined; }
                        if (level === SHUTTER_OPEN) return 100;
                        if (level === SHUTTER_DOWN) return 0;
                        if ([SHUTTER_TOGGLE,SHUTTER_OPEN_TOGGLE,SHUTTER_CLOSE_TOGGLE,SHUTTER_STOP].includes(level)) return undefined;
                        return level;
                }
                getCurrentPosition(callback) { callback(false, this.cachedTargetPosition); }
                getPositionState(callback) { callback(false, Characteristic.PositionState.STOPPED); }
                getTargetPosition(callback) {
                        this.client.receiveLevel(this.netId, result => {
                                const p = this.translateShutterToProportional(result.level);
                                if (typeof p === 'undefined') { return callback(false, 0); }
                                this.cachedTargetPosition = p;
                                callback(false, p);
                        });
                }
                setTargetPosition(newPosition, callback, context) {
                        if (context === 'event') { return callback(); }
                        let direction, interimPosition;
                        if (newPosition > this.cachedTargetPosition) { direction = Characteristic.PositionState.INCREASING; interimPosition = newPosition - 1; }
                        else if (newPosition < this.cachedTargetPosition) { direction = Characteristic.PositionState.DECREASING; interimPosition = newPosition + 1; }
                        else { direction = Characteristic.PositionState.STOPPED; }
                        if (direction !== Characteristic.PositionState.STOPPED) {
                                this.cachedTargetPosition = interimPosition;
                                this.service.setCharacteristic(Characteristic.PositionState, direction);
                                this.service.setCharacteristic(Characteristic.CurrentPosition, interimPosition);
                        }
                        this.client.setLevel(this.netId, this.translateProportionalToShutter(newPosition), () => {
                                setTimeout(() => {
                                        this.cachedTargetPosition = newPosition;
                                        this.service.setCharacteristic(Characteristic.CurrentPosition, newPosition);
                                        this.service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
                                }, SPIN_TIME);
                                callback();
                        });
                }
                processClientData(err, message) {
                        if (!err) {
                                const translated = this.translateShutterToProportional(message.level);
                                if (typeof translated === 'undefined') { this.cachedTargetPosition = 0; return; }
                                if (this.cachedTargetPosition !== translated) {
                                        this.service.getCharacteristic(Characteristic.TargetPosition).setValue(translated, undefined, 'event');
                                        setTimeout(() => {
                                                this.cachedTargetPosition = translated;
                                                this.service.getCharacteristic(Characteristic.CurrentPosition).setValue(translated, undefined, 'event');
                                                this.service.getCharacteristic(Characteristic.PositionState).setValue(Characteristic.PositionState.STOPPED, undefined, 'event');
                                        }, SPIN_TIME);
                                }
                        }
                }
        }

        return CBusShutterAccessory;
};
