"use strict";

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericMap = require("./generic-map");
var PropertyChanges = require("./listen/property-changes");

var __PROTO__REGEXP = /__proto__$/;

module.exports = Dict;
function Dict(values, getDefault) {
    if (!(this instanceof Dict)) {
        return new Dict(values, getDefault);
    }
    getDefault = getDefault || Function.noop;
    this.getDefault = getDefault;
    this._keys = Object.create(null);
    this._initializeStorage();
    this.addEach(values);
}

Object.addEach(Dict.prototype, GenericCollection.prototype);
Object.addEach(Dict.prototype, GenericMap.prototype);
Object.addEach(Dict.prototype, PropertyChanges.prototype);

Dict.Dict = Dict; // hack so require("dict").Dict will work in MontageJS.

Dict.prototype._initializeStorage = function() {
    this.store = [];
    this.indexPool = [];
    this.length = 0;
};

Dict.prototype.constructClone = function (values) {
    return new this.constructor(values, this.getDefault);
};

Dict.prototype.assertString = function (key) {
    if (typeof key !== "string") {
        throw new TypeError("key must be a string but Got " + key);
    }
};

Dict.prototype.get = function (key, defaultValue) {
    this.assertString(key);
    key = ensureUsableKey(key);
    if (key in this._keys) {
        var index = this._keys[key];
        return this.store[index];
    } else if (arguments.length > 1) {
        return defaultValue;
    } else {
        return this.getDefault(key);
    }
};

Dict.prototype.set = function (key, value) {
    this.assertString(key);
    key = ensureUsableKey(key);
    if (key in this._keys) { // update
        var index = this._keys[key];
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[index]);
        }
        this.store[index] = value;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
        return false;
    } else { // create
        var index = this.indexPool.pop();
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, undefined);
        }
        this.length++;
        if (index) {
            this.store[index] = value;
        } else {
            index = this.store.push(value) - 1;
        }
        this._keys[key] = index;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
        return true;
    }
};

Dict.prototype.has = function (key) {
    this.assertString(key);
    key = ensureUsableKey(key);
    return key in this._keys && this._keys[key] != null;
};

Dict.prototype["delete"] = function (key) {
    this.assertString(key);
    key = ensureUsableKey(key);
    if (key in this._keys) {
        var index = this._keys[key];
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[index]);
        }
        delete this._keys[key];
        this.store[index] = null;
        this.indexPool.push(index);
        this.length--;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
        return true;
    }
    return false;
};

Dict.prototype.clear = function () {
    for (var key in this._keys) {
        var index = this._keys[key];
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[index]);
        }
        delete this._keys[key];
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
    }
    this._initializeStorage();
};

Dict.prototype.reduce = function (callback, basis, thisp) {
    for (var key in this._keys) {
        var index = this._keys[key];
        basis = callback.call(thisp, basis, this.store[index], key, this);
    }
    return basis;
};

Dict.prototype.reduceRight = function (callback, basis, thisp) {
    var self = this;
    var store = this.store;
    return Object.keys(this._keys).reduceRight(function (basis, key) {
        return callback.call(thisp, basis, store[key], key, self);
    }, basis);
};

Dict.prototype.one = function () {
    var key;
    for (key in this._keys) {
        var index = this._keys[key];
        return this.store[index];
    }
};

Dict.prototype.toJSON = function () {
    return this.toObject();
};

function ensureUsableKey(key) {
    if (__PROTO__REGEXP.test(key)) {
        key = '$'+key;
    }
    return key;
}
