'use strict';

const cbusUtils = require('../lib/cbus-utils.js');
const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _CBusAccessory, _uuid) {
        const Service = _service;
        const Characteristic = _characteristic;

        class CBusTriggerAccessory extends _CBusAccessory {
                constructor(platform, accessoryData) {
                        super(platform, accessoryData);
                        try {
                                this.action = cbusUtils.integerise(accessoryData.action);
                        } catch (err) {
                                throw new Error('action value \'' + accessoryData.action + '\' for accessory \'' + this.name + '\' is not an integer');
                        }
                        this.service = this.addService(new Service.Switch(this.name));
                        this.service.getCharacteristic(Characteristic.On).on('set', this.setTrigger.bind(this));
                }
                setTrigger(trigger, callback, context) {
                        if (context === 'event') { return callback(); }
                        if (trigger) {
                                this.client.triggerAction(this.netId, this.action, () => {
                                        this.timeout = setTimeout(() => {
                                                this.service.getCharacteristic(Characteristic.On).setValue(0);
                                        }, 500);
                                });
                        }
                        callback();
                }
                processClientData(err, message) {
                        if (!err) {
                                console.assert(typeof message.level !== 'undefined', 'message.level must be defined');
                        }
                }
        }

        return CBusTriggerAccessory;
};
