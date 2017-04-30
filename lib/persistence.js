'use strict';

const util = require('util');
const events = require('events');
const lodash = require('lodash');
const debug = require('debuglog')('storkjs-persistence');

/**
 * Defines the base class for the persistence sub objects.<br>
 *
 * @author Sagie Gur-Ari
 * @class Persistence
 * @public
 * @param {object} input - Holds the runtime and configuration objects used by this class
 * @example
 * ```js
 * //This object should not be created directly, this example only explains the input of the constructor
 * const persistence=new Persistence({
 *  merger: merger, //The merger to persist
 *  onReadyCallback: function() {....}, //An optional callback function which will be invoked when the persistence object is ready to handle merger events (and data was read from the storage and updated the merger).
 *  options: {  //Holds minor behaviour options
 *    writeDelay: 1000,   //Defaults to 1 second (1000) if not provided.
 *    invokeInitialRead: true,    //Invokes a read operation and updates the merger during the creation of this object. Default is true
 *    filter: {...}   //Optional filter for the initial read operation (not relevant if invokeInitialRead = false)
 *  }
 * });
 * ```
 */
function Persistence(input) {
    this.merger = input.merger;

    this.options = lodash.defaults({
        writeDelay: 1000,
        invokeInitialRead: true,
        presistPreRead: false
    }, input.options || {});

    const filter = this.options.filter;
    this.enabled = true;
    this.unpersistRequested = false;
    this.unpersistItems = [];

    events.EventEmitter.call(this);

    const onReadyCallback = input.onReadyCallback || null;
    if (onReadyCallback) {
        this.on('ready', onReadyCallback);
    }

    if (this.options.invokeInitialRead) {
        if (this.options.presistPreRead) {
            this.persist();
        }

        this.read((errorObject, data) => {
            debug('Invoking initial read updating merger.');

            if (this.checkForError(errorObject, 'read-error')) {
                //update merger data with read data
                if (data) {
                    this.merger.override(data, '');
                }

                //start persist monitoring
                if (!this.options.presistPreRead) {
                    this.persist();
                }

                this.emit('ready', null, {
                    merger: this.merger,
                    persistence: this
                });
            } else {
                this.emit('ready', errorObject, {
                    merger: this.merger,
                    persistence: this
                });
            }
        }, filter);
    } else {
        this.persist();
        this.emit('ready', null, {
            merger: this.merger,
            persistence: this
        });
    }
}

//setup inheritance
util.inherits(Persistence, events.EventEmitter);

/**
 * Checks if an error was provided and if so emits the relevant event and returns false (break flow).<br>
 * In case of no error, this method simply returns true (continue flow).
 *
 * @function
 * @memberof! Persistence
 * @private
 * @param {object} errorObject - The error object to validate
 * @param {string} eventName - The event to emit in case an error is found
 * @param {object} [additionalInfo] - Additional info to log in case of an error
 * @returns {boolean} True if no error was found and can continue flow, else false
 */
Persistence.prototype.checkForError = function (errorObject, eventName, additionalInfo) {
    let continueFlow = true;
    if (errorObject) {
        continueFlow = false;
        let str = '';
        if (additionalInfo) {
            str = JSON.stringify(additionalInfo, undefined, 2);
        }
        debug('Error found, sending event: %s\nError Message: %s\nAdditional Info:\n%s\nError:\n', eventName, errorObject.message, str, errorObject);
        this.emit(eventName, errorObject);
    }

    return continueFlow;
};

/**
 * Stops the persistence of the merger.<br>
 * After invocation of this function, this object will no longer be valid and should not be used.
 *
 * @function
 * @memberof! Persistence
 * @public
 */
Persistence.prototype.unpersist = function () {
    this.enabled = false;
    this.unpersistRequested = true;

    if (this.unpersistItems.length > 0) {
        this.unpersistItems.forEach((unpersistItem) => {
            if (unpersistItem) {
                unpersistItem();
            }
        });
        this.unpersistItems = [];
    }
};

/**
 * Subscribes to changes in the provided merger and pushes to the storage (DB, file, mongo, ...).
 *
 * @function
 * @memberof! Persistence
 * @private
 */
Persistence.prototype.persist = function () {
    if (!this.unpersistRequested) {
        if (this.merger) {
            this.persistImpl(this.merger);
        } else {
            throw new Error('merger not provided.');
        }
    }
};

/*eslint-disable no-unused-vars*/
/**
 * Listen to changes in the provided merger and pushes to the storage.
 *
 * @function
 * @memberof! Persistence
 * @private
 */
Persistence.prototype.persistImpl = function () {
    throw new Error('Function not implemented.');
};

/**
 * Reads the data and updates the merger instance.<br>
 * In case of an error, the callback will be called with no data.
 *
 * @function
 * @memberof! Persistence
 * @private
 * @param {function} callback - The callback to be invoked after the data is fetched and grouped.
 * @param {object} filter - The filter of the query operation (optional, may be null for no filtering)
 */
Persistence.prototype.read = function (callback, filter) {
    throw new Error('Function not implemented.');
};

/**
 * Removes the data from the merger but not from the storage.
 *
 * @function
 * @memberof! Persistence
 * @public
 * @param {object} key - The key used to find the item (index for array, primary key for object, ...)
 */
Persistence.prototype.unpersistItem = function (key) {
    throw new Error('Function not implemented.');
};

/**
 * Reads the data from the storage with the given filter and adds it to the merger for persistence.
 *
 * @function
 * @memberof! Persistence
 * @public
 * @param {function} callback - The callback to be invoked after the data is fetched and the merger is updated.
 * @param {object} filter - The filter of the query operation (optional, may be null for no filtering)
 */
Persistence.prototype.persistItems = function (callback, filter) {
    throw new Error('Function not implemented.');
};
/*eslint-enable no-unused-vars*/

module.exports = Persistence;
