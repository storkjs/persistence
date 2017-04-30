'use strict';

const util = require('util');
const fs = require('fs');
const lodash = require('lodash');
const debug = require('debuglog')('storkjs-persistence');
const Persistence = require('./persistence');
const persistenceUtils = require('./utils');

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
    if ((!this.unpersistRequested) && (!this.removeListeners)) {
        const onChange = () => {
            if (!this.unpersistRequested) {
                this.writeSnapshot();
            }
        };

        var handler = onChange;
        if (this.writeDelay && (this.writeDelay > 0)) {
            handler = lodash.throttle(onChange, this.writeDelay, {
                leading: true
            });
        }

        this.merger.on('change', handler);

        this.unpersistItems.push(() => {
            this.merger.removeEventListener('change', handler);
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
    if (this.fileExists) {
        callback();
    } else {
        persistenceUtils.createDirectoryIfNeeded(this.filePath, (error) => {
            if (error) {
                debug('File persistence, unable to create directory, error: ' + error.message, error);
                this.emit('create-error', error);
            }

            persistenceUtils.createFileIfNeeded(this.filePath, (error2) => {
                if (error2) {
                    debug('File persistence, unable to create file, error: ' + error2.message, error2);
                    this.emit('create-error', error);
                } else {
                    this.fileExists = true;
                }

                callback();
            });
        });
    }
};

FilePersistence.prototype.writeSnapshot = function () {
    if (!this.unpersistRequested) {
        var snapshot = this.merger.get();

        this.write(snapshot);
    }
};

FilePersistence.prototype.write = function (snapshot) {
    this.setupFileSystem(() => {
        this.writeAlways(snapshot);
    });
};

FilePersistence.prototype.writeAlways = function (snapshot) {
    if (snapshot) {
        if (this.inWrite) {
            this.writeWait = true;
        } else {
            this.writeWait = false;
            this.inWrite = true;

            let spaces = 0;
            if (this.options.prettyPrint) {
                spaces = 2;
            }

            fs.writeFile(this.filePath, JSON.stringify(snapshot, undefined, spaces), (error) => {
                this.inWrite = false;

                if (error) {
                    this.emit('write-error', error);
                    debug('FilePersistence.write: ' + error.message, error);
                } else {
                    this.emit('write');
                }

                if (this.writeWait) {
                    this.write(this.merger.get());
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
    this.setupFileSystem(() => {
        fs.readFile(this.filePath, {
            encoding: 'utf8'
        }, (error, data) => {
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
