"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var mobx_1 = require("mobx");
var patchType_1 = require("./enums/patchType");
var Model_1 = require("./Model");
var consts_1 = require("./consts");
var utils_1 = require("./utils");
/**
 * MobX Collection class
 *
 * @export
 * @class Collection
 * @implements {ICollection}
 */
var Collection = /** @class */ (function () {
    /**
     * Creates an instance of Collection.
     *
     * @param {Array<object>} [data=[]]
     *
     * @memberOf Collection
     */
    function Collection(data) {
        if (data === void 0) { data = []; }
        /**
         * Internal data storage
         *
         * @private
         * @type {IObservableArray<IModel>}
         * @memberOf Collection
         */
        this.__data = mobx_1.observable([]);
        this.__modelHash = {};
        /**
         * A list of all registered patch listeners
         *
         * @private
         * @memberof Model
         */
        this.__patchListeners = [];
        this.insert(data);
        var computedProps = {};
        for (var _i = 0, _a = this.static.types; _i < _a.length; _i++) {
            var model = _a[_i];
            computedProps[model.type] = this.__getByType(model.type);
        }
        mobx_1.extendObservable(this, computedProps);
    }
    /**
     * Insert serialized models into the store
     *
     * @param {(Array<object>|object)} data models to insert
     * @memberof Collection
     */
    Collection.prototype.insert = function (data) {
        var _this = this;
        var items = [].concat(data)
            .map(function (item) {
            var type = item[consts_1.TYPE_PROP];
            if (!type) {
                throw new Error('The input is not valid. Make sure you used model.toJS or model.snapshot to serialize it');
            }
            return item;
        })
            .map(function (item) {
            var modelType = item[consts_1.TYPE_PROP];
            var type = _this.__getModel(modelType);
            var existing = _this.__modelHash[modelType] &&
                _this.__modelHash[modelType][utils_1.getProp(item, type.idAttribute)];
            /* istanbul ignore if */
            if (existing) {
                // tslint:disable-next-line:no-string-literal
                existing['__silent'] = true;
                existing.update(item);
                // tslint:disable-next-line:no-string-literal
                existing['__silent'] = false;
                return existing;
            }
            else {
                var instance = _this.__initItem(item);
                var id = utils_1.getProp(item, instance.static.idAttribute);
                _this.__modelHash[modelType] = _this.__modelHash[modelType] || {};
                _this.__modelHash[modelType][id] = instance;
                _this.__data.push(instance);
                return instance;
            }
        });
        return items;
    };
    Object.defineProperty(Collection.prototype, "static", {
        /**
         * Static model class
         *
         * @readonly
         * @type {typeof Collection}
         * @memberOf Collection
         */
        get: function () {
            return this.constructor;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "length", {
        /**
         * Number of unique models in the collection
         *
         * @readonly
         * @type {number}
         * @memberOf Collection
         */
        get: function () {
            return this.__data.length;
        },
        enumerable: true,
        configurable: true
    });
    Collection.prototype.add = function (model, type) {
        var _this = this;
        if (model instanceof Array) {
            return model.map(function (item) { return _this.add(item, type); });
        }
        var instance = this.__getModelInstance(model, type);
        var modelType = utils_1.getType(instance);
        var id = utils_1.getProp(instance, instance.static.idAttribute);
        var existing = this.find(modelType, id);
        if (existing) {
            existing.update(existing.static.preprocess(model));
            return existing;
        }
        this.__modelHash[modelType] = this.__modelHash[modelType] || {};
        this.__modelHash[modelType][id] = instance;
        this.__data.push(instance);
        this.__triggerChange(patchType_1.default.ADD, instance, instance);
        return instance;
    };
    /**
     * Find a specific model
     *
     * @template T
     * @argument {IType} type - Type of the model that will be searched for
     * @argument {string|number} [id] - ID of the model (if none is defined, the first result will be returned)
     * @returns {T} Found model
     *
     * @memberOf Collection
     */
    Collection.prototype.find = function (type, id) {
        return id
            ? ((this.__modelHash[type] && this.__modelHash[type][id]) || null)
            : this.__data.find(function (item) { return utils_1.getType(item) === type; }) || null;
    };
    /**
     * Find all models of the specified type
     *
     * @template T
     * @argument {IType} type - Type of the models that will be searched for
     * @returns {Array<T>} Found models
     *
     * @memberOf Collection
     */
    Collection.prototype.findAll = function (type) {
        return this.__data.filter(function (item) { return utils_1.getType(item) === type; });
    };
    /**
     * Remove a specific model from the collection
     *
     * @template T
     * @argument {IType} type - Type of the model that will be removed
     * @argument {string|number} [id] - ID of the model (if none is defined, the first result will be removed)
     * @returns {T} Removed model
     *
     * @memberOf Collection
     */
    Collection.prototype.remove = function (type, id) {
        var model = this.find(type, id);
        this.__removeModels([model]);
        return model;
    };
    /**
     * Remove all models of the specified type from the collection
     *
     * @template T
     * @argument {IType} type - Type of the models that will be removed
     * @returns {Array<T>} Removed models
     *
     * @memberOf Collection
     */
    Collection.prototype.removeAll = function (type) {
        var models = this.findAll(type);
        this.__removeModels(models);
        return models;
    };
    /**
     * Reset the collection - remove all models
     *
     * @memberOf Collection
     */
    Collection.prototype.reset = function () {
        var models = this.__data.slice();
        this.__removeModels(models);
    };
    /**
     * Convert the collection (and containing models) into a plain JS Object in order to be serialized
     *
     * @returns {Array<IDictionary>} Plain JS Object Array representing the collection and all its models
     *
     * @memberOf Collection
     */
    Collection.prototype.toJS = function () {
        return this.__data.map(function (item) { return item.toJS(); });
    };
    Object.defineProperty(Collection.prototype, "snapshot", {
        /**
         * Exposed snapshot state of the collection
         *
         * @readonly
         * @memberof Collection
         */
        get: function () {
            return this.__data.map(function (item) { return item.snapshot; });
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add a listener for patches
     *
     * @param {(data: IPatch) => void} listener A new listener
     * @returns {() => void} Function used to remove the listener
     * @memberof Collection
     */
    Collection.prototype.patchListen = function (listener) {
        var _this = this;
        this.__patchListeners.push(listener);
        return function () {
            /* istanbul ignore next */
            _this.__patchListeners = _this.__patchListeners.filter(function (item) { return item !== listener; });
        };
    };
    /**
     * Apply an existing JSONPatch on the model
     *
     * @param {IPatch} patch The patch object
     * @memberof Collection
     */
    Collection.prototype.applyPatch = function (patch) {
        var _a = patch.path.slice(1).split('/'), type = _a[0], id = _a[1], field = _a[2];
        var model = this.__modelHash && this.__modelHash[type] && this.__modelHash[type][id];
        if (field) {
            var modelPatch = utils_1.assign({}, patch, { path: "/" + field });
            model.applyPatch(modelPatch);
        }
        else if (patch.op === patchType_1.default.ADD) {
            this.add(patch.value);
        }
        else if (patch.op === patchType_1.default.REMOVE && model) {
            this.remove(utils_1.getType(model), utils_1.getProp(model, model.static.idAttribute));
        }
    };
    /**
     * Get a list of the type models
     *
     * @private
     * @argument {IType} type - Type of the model
     * @returns {IComputedValue<Array<IModel>>} Getter function
     *
     * @memberOf Collection
     */
    Collection.prototype.__getByType = function (type) {
        var _this = this;
        return mobx_1.computed(function () { return _this.__data.filter(function (item) { return utils_1.getType(item) === type; }); });
    };
    /**
     * Get the model constructor for a given model type
     *
     * @private
     * @argument {IType} type - The model type we need the constructor for
     * @returns {IModelConstructor} The matching model constructor
     *
     * @memberOf Collection
     */
    Collection.prototype.__getModel = function (type) {
        return utils_1.first(this.static.types.filter(function (item) { return item.type === type; })) || Model_1.Model;
    };
    /**
     * Initialize a model based on an imported Object
     *
     * @private
     * @argument {Object} item - Imported model POJO
     * @returns {IModel} The new model
     *
     * @memberOf Collection
     */
    Collection.prototype.__initItem = function (item) {
        var type = item[consts_1.TYPE_PROP];
        var TypeModel = this.__getModel(type);
        return new TypeModel(item, this);
    };
    /**
     * Prepare the model instance either by finding an existing one or creating a new one
     *
     * @private
     * @param {IModel|Object} model - Model data
     * @param {IOpts} [type] - Model type
     * @returns {IModel} - Model instance
     *
     * @memberOf Collection
     */
    Collection.prototype.__getModelInstance = function (model, type) {
        if (model instanceof Model_1.Model) {
            model.__collection = this;
            return model;
        }
        else {
            var typeName = typeof type === 'object' ? type.type : type;
            var TypeModel = this.__getModel(typeName);
            return new TypeModel(model, type, this);
        }
    };
    /**
     * Remove models from the collection
     *
     * @private
     * @param {Array<IModel>} models - Models to remove
     *
     * @memberOf Collection
     */
    Collection.prototype.__removeModels = function (models) {
        var _this = this;
        models.forEach(function (model) {
            if (model) {
                var id = utils_1.getProp(model, model.static.idAttribute);
                _this.__data.remove(model);
                _this.__modelHash[utils_1.getType(model)][id] = null;
                model.__collection = null;
                // tslint:disable-next-line:no-string-literal
                _this.__triggerChange(patchType_1.default.REMOVE, model, undefined, model);
            }
        });
    };
    /**
     * Function that creates a patch object and calls all listeners
     *
     * @private
     * @param {patchType} type Action type
     * @param {string} field Field where the action was made
     * @param {*} [value] The new value (if it applies)
     * @memberof Model
     */
    Collection.prototype.__triggerChange = function (type, model, value, oldValue) {
        var patchObj = {
            oldValue: oldValue,
            op: type,
            path: '',
            value: value,
        };
        this.__onPatchTrigger(patchObj, model);
    };
    /**
     * Pass model patches trough to the collection listeners
     *
     * @private
     * @param {IPatch} patch Model patch object
     * @param {IModel} model Updated model
     * @memberof Collection
     */
    Collection.prototype.__onPatchTrigger = function (patch, model) {
        var id = utils_1.getProp(model, model.static.idAttribute);
        var collectionPatch = utils_1.assign({}, patch, {
            path: "/" + utils_1.getType(model) + "/" + id + patch.path,
        });
        this.__patchListeners.forEach(function (listener) { return typeof listener === 'function' && listener(collectionPatch, model); });
    };
    /**
     * List of custom model types
     *
     * @static
     * @type {Array<IModelConstructor>}
     * @memberOf Collection
     */
    Collection.types = [];
    __decorate([
        mobx_1.action
    ], Collection.prototype, "insert", null);
    __decorate([
        mobx_1.computed
    ], Collection.prototype, "length", null);
    __decorate([
        mobx_1.action
    ], Collection.prototype, "add", null);
    __decorate([
        mobx_1.action
    ], Collection.prototype, "removeAll", null);
    __decorate([
        mobx_1.action
    ], Collection.prototype, "reset", null);
    __decorate([
        mobx_1.computed
    ], Collection.prototype, "snapshot", null);
    __decorate([
        mobx_1.action
    ], Collection.prototype, "__removeModels", null);
    __decorate([
        mobx_1.action.bound
    ], Collection.prototype, "__onPatchTrigger", null);
    return Collection;
}());
exports.Collection = Collection;
