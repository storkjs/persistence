'use strict';

var path = require('path');
var fs = require('fs');

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
        var self = this;
        callback = callback || function () {};

        var directoryPath = path.join(childPath, '..');
        fs.exists(directoryPath, function (exists) {
            if (!exists) {
                self.createDirectoryIfNeeded(directoryPath, function (error) {
                    if (error) {
                        callback(error);
                    } else {
                        fs.mkdir(directoryPath, null, function (error2) {
                            if (error2) {
                                if (fs.existsSync(directoryPath)) {
                                    callback();
                                } else {
                                    callback(error2);
                                }
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
        var self = this;

        callback = callback || function () {};

        fs.exists(filePath, function (exists) {
            if (!exists) {
                fs.open(filePath, 'w+', function (error, fd) {
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
