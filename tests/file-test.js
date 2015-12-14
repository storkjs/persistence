'use strict';
/*global describe: false, it: false */

var EventEmitter = require('events').EventEmitter;
var chai = require('chai');
var assert = chai.assert;
var FilePersistence = require('..').File;
var path = require('path');
var fs = require('fs');
var tempDir = path.join(__dirname, '../target/temp');
var persistenceUtils = require('../lib/utils');

describe('file', function () {
    var createMerger = function (data, file, callback) {
        var merger = new EventEmitter();
        merger.object = data || {};

        merger.override = function (data) {
            merger.object = data;
        };

        persistenceUtils.createDirectoryIfNeeded(file, function () {
            callback(merger);
        });
    };

    var createObj = function () {
        return {
            a: 123,
            b: 'test',
            c: [1, 2, 3],
            d: {
                a: true,
                b: [2]
            }
        };
    };

    describe('init', function () {
        it('no file', function (done) {
            var file = path.join(tempDir, 'init1.json');

            createMerger({}, file, function (merger) {
                FilePersistence.create(file, merger, {}, function (error, state) {
                    assert.isNull(error);
                    assert.isDefined(state);

                    done();
                });
            });
        });

        it('file with json data', function (done) {
            var file = path.join(tempDir, 'init2.json');

            createMerger({}, file, function (merger) {
                fs.writeFileSync(file, JSON.stringify(createObj()), {
                    encoding: 'utf8'
                });

                FilePersistence.create(file, merger, {
                    invokeInitialRead: true
                }, function (error, state) {
                    assert.isNull(error);
                    assert.isDefined(state);

                    assert.deepEqual(createObj(), merger.object);

                    done();
                });
            });
        });

        it('file with invalid data', function (done) {
            var file = path.join(tempDir, 'init2.json');

            createMerger({}, file, function (merger) {
                fs.writeFileSync(file, 'abc', {
                    encoding: 'utf8'
                });

                FilePersistence.create(file, merger, {
                    invokeInitialRead: true
                }, function (error, state) {
                    assert.isNull(error);
                    assert.isDefined(state);

                    assert.deepEqual({}, merger.object);

                    done();
                });
            });
        });
    });

    describe('on changes', function () {
        it('multiple change events', function (done) {
            var file = path.join(tempDir, 'change1.json');

            createMerger({}, file, function (merger) {
                FilePersistence.create(file, merger, {
                    invokeInitialRead: true
                }, function (error, state) {
                    assert.isNull(error);
                    assert.isDefined(state);

                    assert.deepEqual({}, merger.object);

                    /*TODO NEED REAL MERGER HERE!!!
                    merger.override({
                        a: 'a',
                        b: 2,
                        c: [1, 2, 3],
                        d: {
                            a: true,
                            b: false
                        }
                    });

                    merger.delete('d.a');

                    merger.merge({c: 'yes'}, )
                    */

                    done();
                });
            });
        });
    });
});
