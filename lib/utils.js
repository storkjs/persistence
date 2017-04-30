'use strict';

const path = require('path');
const fs = require('fs');

const noop = () => {
    return undefined;
};

module.exports = {
    /**
     * Ensures the target directory exists and if so, calls the provided callback (may be null)
     *
     * @function
     * @memberof! PersistenceUtils
     * @private
     * @param {string} childPath - The child path to which to find the parent directory for
     * @param {object} callback - The callback to call after the directory is created (may be null)
     */
    createDirectoryIfNeeded: function (childPath, callback) {
        callback = callback || noop;

        const directoryPath = path.join(childPath, '..');
        fs.exists(directoryPath, (exists) => {
            if (!exists) {
                this.createDirectoryIfNeeded(directoryPath, (error) => {
                    if (error) {
                        callback(error);
                    } else {
                        fs.mkdir(directoryPath, null, (error2) => {
                            if (error2) {
                                fs.exists((dirExists) => {
                                    if (dirExists) {
                                        callback();
                                    } else {
                                        callback(error2);
                                    }
                                });
                            } else {
                                callback();
                            }
                        });
                    }
                });
            } else {
                callback();
            }
        });
    },
    createFileIfNeeded: function (filePath, callback) {
        callback = callback || noop;

        fs.exists(filePath, (exists) => {
            if (!exists) {
                fs.open(filePath, 'w+', (error, fd) => {
                    if (error) {
                        callback(error);
                    } else {
                        fs.close(fd, callback);
                    }
                });
            } else {
                callback();
            }
        });
    }
};
