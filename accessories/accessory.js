'use strict';

require('../hot-debug.js');
const log = require('debug')('cbus:accessory');
const chalk = require('chalk');
const cbusUtils = require('../lib/cbus-utils.js');
const CBusNetId = require('../lib/cbus-netid.js');

module.exports = function (_service, _characteristic, _accessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;
        const HAPAccessory = _accessory;
        const uuid = _uuid;

        class CBusAccessory extends HAPAccessory {
                constructor(platform, accessoryData) {
                        console.assert(typeof accessoryData.type !== 'undefined', 'accessoryData.type must not be undefined');

                        if (typeof accessoryData.name !== 'string') {
                                throw new Error('missing required \'name\' field');
                        }
                        if (typeof accessoryData.id === 'undefined') {
                                throw new Error('accessory \'' + accessoryData.name + '\' missing required \'id\' field');
                        }

                        let groupAddress;
                        try {
                                groupAddress = cbusUtils.integerise(accessoryData.id);
                        } catch (err) {
                                throw new Error('id \'' + accessoryData.id + '\' for accessory \'' + accessoryData.name + '\' is not an integer');
                        }

                        if (typeof accessoryData.action !== 'undefined') {
                                try { cbusUtils.integerise(accessoryData.action); } catch (err) {
                                        throw new Error('action value \'' + accessoryData.action + '\' for accessory \'' + accessoryData.name + '\' is not an integer');
                                }
                        }

                        const netId = new CBusNetId(
                                platform.project,
                                accessoryData.network || platform.client.network,
                                accessoryData.application || platform.client.application,
                                groupAddress,
                                accessoryData.channel
                        );

                        super(accessoryData.name, uuid.generate(netId.getHash()));

                        this.client = platform.client;
                        this.accessoryData = accessoryData;
                        this.type = accessoryData.type;
                        this.name = accessoryData.name;
                        this.netId = netId;

                        const service = this.getService(Service.AccessoryInformation);
                        service.setCharacteristic(Characteristic.Manufacturer, 'Clipsal C-Bus');
                        service.setCharacteristic(Characteristic.SerialNumber, this.netId.toString());
                        service.setCharacteristic(Characteristic.Model, this.type);
                }

                getServices() {
                        return this.services;
                }

                _log(file, action, message) {
                        const fileName = file.split('-')[0];
                        const accessoryLabel = cbusUtils.formatTag(this.name, this.netId);
                        log(chalk.gray.bold(fileName) + ' ' + accessoryLabel + ' ' + chalk.red(action) + ' ' + message);
                }
        }

        return CBusAccessory;
};
