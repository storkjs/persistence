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
     * @param {object} callback - The callback to call after the directory is created (may be null)
     * @param {string} childPath - The child path to which to find the parent directory for (if null, use the this.filePath)
     */
    createDirectoryIfNeeded: function (callback, childPath) {
        var self = this;
        callback = callback || function () {};

        if (!this.fileExists) {
            if (!childPath) {
                childPath = this.filePath;
            }
            var directoryPath = path.join(childPath, '..');
            fs.exists(directoryPath, function (exists) {
                if (!exists) {
                    self.createDirectoryIfNeeded(function (error) {
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
                    }, directoryPath);
                } else {
                    callback();
                }
            });
        } else {
            callback();
        }
    },
    createFileIfNeeded: function (callback) {
        var self = this;
        if (self.fileExists) {
            callback();
        } else {
            callback = callback || function () {};

            fs.exists(this.filePath, function (exists) {
                if (!exists) {
                    fs.open(self.filePath, 'w+', function (error, fd) {
                        if (error) {
                            callback(error);
                        } else {
                            fs.close(fd, callback);
                            self.fileExists = true;
                        }
                    });
                } else {
                    callback();
                }
            });
        }
    }
};
