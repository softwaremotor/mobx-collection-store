"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var mobx_1 = require("mobx");
var assign = require('object-assign');
var consts_1 = require("./consts");
var utils_1 = require("./utils");
var __reservedKeys = [
    'static', 'assign', 'assignRef', 'update', 'toJS',
    '__id', '__collection',
    '__data', '__getProp', '__initializedProps',
    '__getRef', '__setRef', '__initRefGetter', '__initRefGetters',
    '__partialRefUpdate'
];
/**
 * MobX Collection Model class
 *
 * @class Model
 * @implements {IModel}
 */
var Model = (function () {
    /**
     * Creates an instance of Model.
     *
     * @param {Object} initialData
     * @param {ICollection} [collection]
     *
     * @memberOf Model
     */
    function Model(initialData, collection) {
        /**
         * Collection the model belongs to
         *
         * @type {ICollection}
         * @memberOf Model
         */
        this.__collection = null;
        /**
         * List of properties that were initialized on the model
         *
         * @private
         * @type {Array<string>}
         * @memberOf Model
         */
        this.__initializedProps = [];
        /**
         * The model references
         *
         * @static
         * @type {IReferences}
         * @memberOf Model
         */
        this.__refs = {};
        /**
         * Internal data storage
         *
         * @private
         * @type {IObservableObject}
         * @memberOf Model
         */
        this.__data = mobx_1.observable({});
        var data = assign({}, this.static.defaults, initialData);
        if (!data[this.static.idAttribute]) {
            if (!this.static.enableAutoId) {
                throw new Error(this.static.idAttribute + " is required!");
            }
            else {
                var used = void 0;
                do {
                    data[this.static.idAttribute] = this.static.autoIdFunction();
                    used = collection.find(this.static.type, data[this.static.idAttribute]);
                } while (used);
            }
        }
        // No need for them to be observable
        this.__id = data[this.static.idAttribute];
        this.__collection = collection;
        this.__initRefGetters();
        this.update(data);
    }
    /**
     * Function used for generating the autoincrement IDs
     *
     * @static
     * @returns {number|string} id
     *
     * @memberOf Model
     */
    Model.autoIdFunction = function () {
        var id = this.autoincrementValue;
        this.autoincrementValue++;
        return id;
    };
    /**
     * Add new reference getter/setter to the model
     *
     * @private
     * @param {any} ref - reference name
     *
     * @memberOf Model
     */
    Model.prototype.__initRefGetter = function (ref, type) {
        this.__initializedProps.push(ref, ref + "Id");
        this.__refs[ref] = type || this.static.refs[ref];
        mobx_1.extendObservable(this, (_a = {},
            _a[ref] = this.__getRef(ref),
            _a[ref + "Id"] = this.__getProp(ref),
            _a));
        var _a;
    };
    /**
     * Initialize the reference getters based on the static refs property
     *
     * @private
     *
     * @memberOf Model
     */
    Model.prototype.__initRefGetters = function () {
        var refKeys = Object.keys(this.static.refs);
        for (var _i = 0, refKeys_1 = refKeys; _i < refKeys_1.length; _i++) {
            var ref = refKeys_1[_i];
            this.__initRefGetter(ref);
        }
    };
    /**
     * Getter for the computed referenced model
     *
     * @private
     * @argument {string} ref - Reference name
     * @returns {IComputedValue<IModel>} Getter function
     *
     * @memberOf Model
     */
    Model.prototype.__getRef = function (ref) {
        var _this = this;
        return mobx_1.computed(function () { return _this.__collection ? _this.__getReferencedModels(ref) : null; }, function (value) { return _this.assign(ref, value); });
    };
    /**
     * Getter for the computed property value
     *
     * @private
     * @argument {string} key - Property name
     * @returns {IComputedValue<IModel>} Getter function
     *
     * @memberOf Model
     */
    Model.prototype.__getProp = function (key) {
        var _this = this;
        return mobx_1.computed(function () { return _this.__data[key]; }, function (value) { return _this.assign(key, value); });
    };
    /**
     * Get the reference id
     *
     * @private
     * @template T
     * @param {string} type - type fo the reference
     * @param {T} item - model reference
     * @returns {number|string}
     *
     * @memberOf Model
     */
    Model.prototype.__getValueRefs = function (type, item) {
        if (typeof item === 'object') {
            var model = this.__collection.add(item, type);
            return model.__id;
        }
        else {
            return item;
        }
    };
    /**
     * Update the referenced array on push/pull/update
     *
     * @private
     * @param {string} ref - reference name
     * @param {any} change - MobX change object
     * @returns {null} no direct change
     *
     * @memberOf Model
     */
    Model.prototype.__partialRefUpdate = function (ref, change) {
        var type = this.__refs[ref];
        if (change.type === 'splice') {
            var added = change.added.map(this.__getValueRefs.bind(this, type));
            (_a = this.__data[ref]).splice.apply(_a, [change.index, change.removeCount].concat(added));
            return null;
        }
        else if (change.type === 'update') {
            var newValue = this.__getValueRefs(type, change.newValue);
            this.__data[ref][change.index] = newValue;
            return null;
        }
        return change;
        var _a;
    };
    /**
     * Get the model(s) referenced by a key
     *
     * @private
     * @param {string} key - the reference key
     * @returns {(IModel|Array<IModel>)}
     *
     * @memberOf Model
     */
    Model.prototype.__getReferencedModels = function (key) {
        var _this = this;
        var dataModels = utils_1.mapItems(this.__data[key], function (refId) {
            return _this.__collection.find(_this.__refs[key], refId);
        });
        if (dataModels instanceof Array) {
            var data = mobx_1.observable(dataModels);
            mobx_1.intercept(data, function (change) { return _this.__partialRefUpdate(key, change); });
            return data;
        }
        return dataModels;
    };
    /**
     * Setter for the referenced model
     * If the value is an object it will be upserted into the collection
     *
     * @private
     * @argument {string} ref - Reference name
     * @argument {T} val - The referenced mode
     * @returns {IModel} Referenced model
     *
     * @memberOf Model
     */
    Model.prototype.__setRef = function (ref, val) {
        var type = this.__refs[ref];
        var refs = utils_1.mapItems(val, this.__getValueRefs.bind(this, type));
        // TODO: Could be optimised based on __initializedProps?
        mobx_1.extendObservable(this.__data, (_a = {}, _a[ref] = refs, _a));
        // Find the referenced model(s) in collection
        return this.__collection ? this.__getReferencedModels(ref) : null;
        var _a;
    };
    Object.defineProperty(Model.prototype, "static", {
        /**
         * Static model class
         *
         * @readonly
         * @type {typeof Model}
         * @memberOf Model
         */
        get: function () {
            return this.constructor;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Update the existing model
     *
     * @augments {IModel|Object} data - The new model
     * @returns {Object} Values that have been updated
     *
     * @memberOf Model
     */
    Model.prototype.update = function (data) {
        var _this = this;
        if (data === this) {
            return this; // Nothing to do - don't update with itself
        }
        var vals = {};
        var keys = Object.keys(data);
        var idAttribute = this.static.idAttribute;
        keys.forEach(function (key) {
            if (__reservedKeys.indexOf(key) !== -1) {
                return; // Skip the key because it would override the internal key
            }
            if (key !== idAttribute || !_this.__data[idAttribute]) {
                vals[key] = _this.assign(key, data[key]);
            }
        });
        return vals;
    };
    /**
     * Set a specific model property
     *
     * @argument {string} key - Property to be set
     * @argument {T} value - Value to be set
     * @returns {T|IModel} The set value (Can be an IModel if the value vas a reference)
     *
     * @memberOf Model
     */
    Model.prototype.assign = function (key, value) {
        var val = value;
        var isRef = key in this.__refs;
        if (isRef) {
            val = this.__setRef(key, value);
        }
        else {
            // TODO: Could be optimised based on __initializedProps?
            mobx_1.extendObservable(this.__data, (_a = {}, _a[key] = value, _a));
        }
        // Add getter if it doesn't exist yet
        if (this.__initializedProps.indexOf(key) === -1) {
            this.__initializedProps.push(key);
            mobx_1.extendObservable(this, (_b = {}, _b[key] = this.__getProp(key), _b));
        }
        return val;
        var _a, _b;
    };
    /**
     * Assign a new reference to the model
     *
     * @template T
     * @param {string} key - reference name
     * @param {T} value - reference value
     * @param {string} [type] - reference type
     * @returns {(T|IModel|Array<IModel>)} - referenced model(s)
     *
     * @memberOf Model
     */
    Model.prototype.assignRef = function (key, value, type) {
        if (key in this.__refs) {
            return this.assign(key, value);
        }
        this.__refs[key] = type;
        var data = this.__setRef(key, value);
        var item = data instanceof Array ? data[0] : data;
        var refType = item ? item.static.type : consts_1.DEFAULT_TYPE;
        this.__initRefGetter(key, refType);
        return data;
    };
    /**
     * Convert the model into a plain JS Object in order to be serialized
     *
     * @returns {Object} Plain JS Object representing the model
     *
     * @memberOf Model
     */
    Model.prototype.toJS = function () {
        var data = mobx_1.toJS(this.__data);
        data[consts_1.TYPE_PROP] = this.static.type === consts_1.DEFAULT_TYPE
            ? this.__data[this.static.typeAttribute]
            : this.static.type;
        return data;
    };
    return Model;
}());
exports.Model = Model;
/**
 * The attribute that should be used as the unique identifier
 *
 * @static
 * @type {string}
 * @memberOf Model
 */
Model.idAttribute = 'id';
/**
 * The references that the model can have to other models
 *
 * @static
 * @type {IReferences}
 * @memberOf Model
 */
Model.refs = {};
/**
 * Default values of model props
 *
 * @static
 * @type {IDictionary}
 * @memberOf Model
 */
Model.defaults = {};
/**
 * Type of the model
 *
 * @static
 * @type {string}
 * @memberOf Model
 */
Model.type = consts_1.DEFAULT_TYPE;
/**
 * Atribute name for the type attribute
 *
 * @static
 * @type {string}
 * @memberOf Model
 */
Model.typeAttribute = consts_1.TYPE_PROP;
/**
 * Defines if the model should use autoincrement id if none is defined
 *
 * @static
 * @type {boolean}
 * @memberOf Model
 */
Model.enableAutoId = true;
/**
 * Autoincrement counter used for the builtin function
 *
 * @private
 * @static
 *
 * @memberOf Model
 */
Model.autoincrementValue = 1;
__decorate([
    mobx_1.action
], Model.prototype, "___partialRefUpdate", null);
__decorate([
    mobx_1.action
], Model.prototype, "update", null);
__decorate([
    mobx_1.action
], Model.prototype, "assign", null);
__decorate([
    mobx_1.action
], Model.prototype, "assignRef", null);
;
