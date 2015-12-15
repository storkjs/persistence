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
var MergeDiff = require('diff-merge');
var rimraf = require('rimraf');

describe('file', function () {
    rimraf.sync(tempDir);

    var createMerger = function (data, file, callback) {
        var merger = new MergeDiff(data || {});

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

                    var testMerger = new MergeDiff({});
                    testMerger.override(createObj());
                    assert.deepEqual(merger.get(), testMerger.get());

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

                    assert.deepEqual(merger.get(), {});

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

                    assert.deepEqual(merger.get(), {});

                    merger.override({
                        a: 'a',
                        b: 2,
                        c: [1, 2, 3],
                        d: {
                            a: true,
                            b: false,
                            c: 'no'
                        }
                    });

                    merger.delete('d.a');

                    merger.merge({c: 'yes'}, 'd');

                    setTimeout(function () {
                        var data = fs.readFileSync(file, {
                            encoding: 'utf8'
                        });

                        assert.isTrue(data.length > 0);

                        data = JSON.parse(data);

                        assert.deepEqual(merger.get(), data);

                        done();
                    }, 500);
                });
            });
        });
    });
});
