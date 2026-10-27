'use strict';

const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusTemperatureAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        this.service = this.addService(new Service.TemperatureSensor(this.name));
                }
                processClientData(err, message) {
                        const currentTemp = message.remainder && message.remainder.length >= 4 &&
                                Number(message.remainder[1]) * Math.pow(10, Number(message.remainder[2]));
                        const temperatureDisplayUnits = message.remainder && message.remainder.length >= 4 &&
                                Number(message.remainder[3]);
                        if (!err) {
                                this._log(FILE_ID, message.application + ' event', currentTemp);
                                this.service.getCharacteristic(Characteristic.CurrentTemperature).setValue(currentTemp);
                                this.service.getCharacteristic(Characteristic.TemperatureDisplayUnits).setValue(temperatureDisplayUnits);
                        }
                }
        }

        return CBusTemperatureAccessory;
};
