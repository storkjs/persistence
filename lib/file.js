'use strict';

var util = require('util');
var events = require('events');
var fs = require('fs');
var lodash = require('lodash');
var debug = require('debuglog')('storkjs-persistence');
var Persistence = require('./persistence');
var persistenceUtils = require('./utils');

/**
 * Persists the data to a file based storage.<br>
 *
 * @author Sagie Gur-Ari
 * @class FilePersistence
 * @extends Persistence
 * @public
 * @param {string} file - The file to store/load the data
 * @param {object} merger - The merger to persist
 * @param {object} [options] - The persistence options
 * @param {object} [callback] - An optional callback function which will be invoked when the persistence object is ready to handle merger events (and data was read from the storage and updated the merger).
 */
function FilePersistence(file, merger, options, callback) {
    if (arguments.length === 2) {
        if (typeof arguments[1] === 'function') {
            callback = options;
            options = null;
        }
    }

    this.filePath = file;

    Persistence.call(this, {
        merger: merger,
        onReadyCallback: callback,
        options: options
    });
}

//setup inheritance
util.inherits(FilePersistence, Persistence);

/**
 * Listen to changes in the provided merger and pushes to the storage.
 *
 * @function
 * @memberof! FilePersistence
 * @private
 */
FilePersistence.prototype.persistImpl = function () {
    var self = this;

    if ((!self.unpersistRequested) && (self.removeListeners === null)) {
        var onChange = function onChange() {
            if (!self.unpersistRequested) {
                self.writeSnapshot();
            }
        };

        var handler = onChange;
        if (self.writeDelay && (self.writeDelay > 0)) {
            handler = lodash.throttle(onChange, self.writeDelay, {
                leading: true
            });
        }

        self.merger.on('change', handler);

        self.unpersistItems.push(function () {
            self.merger.removeEventListener('change', handler);
        });
    }
};

/**
 * Ensures the target directory and file exists.
 *
 * @function
 * @memberof! FilePersistence
 * @private
 * @param {object} callback - The callback to call after the directory is created (may be null)
 */
FilePersistence.prototype.setupFileSystem = function (callback) {
    var self = this;

    if (self.fileExists) {
        callback();
    } else {
        persistenceUtils.createDirectoryIfNeeded(self.filePath, function (error) {
            if (error) {
                debug('File persistence, unable to create directory, error: ' + error.message, error);
                self.emit('create-error', error);
            }

            persistenceUtils.createFileIfNeeded(self.filePath, function (error2) {
                if (error2) {
                    debug('File persistence, unable to create file, error: ' + error2.message, error2);
                    self.emit('create-error', error);
                } else {
                    self.fileExists = true;
                }

                callback();
            });
        });
    }
};

FilePersistence.prototype.writeSnapshot = function () {
    var self = this;

    if (!self.unpersistRequested) {
        var snapshot = self.merger.get();

        self.write(snapshot);
    }
};

FilePersistence.prototype.write = function (snapshot) {
    var self = this;
    self.setupFileSystem(function () {
        self.writeAlways(snapshot);
    });
};

FilePersistence.prototype.writeAlways = function (snapshot) {
    var self = this;
    if (snapshot) {
        if (self.inWrite) {
            self.writeWait = true;
        } else {
            self.writeWait = false;
            self.inWrite = true;
            fs.writeFile(this.filePath, JSON.stringify(snapshot, undefined, this.options.prettyPrint ? 2 : 0), function (error) {
                self.inWrite = false;

                if (error) {
                    self.emit('write-error', error);
                    debug('FilePersistence.write: ' + error.message, error);
                } else {
                    self.emit('write');
                }

                if (self.writeWait) {
                    self.write(self.merger.get());
                }
            });
        }
    }
};

/**
 * Reads the data and updates the merger instance.<br>
 * In case of an error, the callback will be called with no data.
 *
 * @function
 * @memberof! FilePersistence
 * @private
 * @param {function} callback - The callback to be invoked after the data is fetched and grouped.
 */
FilePersistence.prototype.read = function (callback) {
    var self = this;
    self.setupFileSystem(function () {
        fs.readFile(self.filePath, {
            encoding: 'utf8'
        }, function (error, data) {
            if ((!error) && data) {
                var dataObject = null;
                try {
                    dataObject = JSON.parse(data);
                } catch (parseError) {
                    debug('FilePersistence.read.parse: ' + parseError.message, parseError);
                    dataObject = {};
                }

                callback(null, dataObject);
            } else {
                callback(null, {});
            }
        });
    });
};

module.exports = {
    create: function (file, merger, options, callback) {
        return new FilePersistence(file, merger, options, callback);
    }
};
