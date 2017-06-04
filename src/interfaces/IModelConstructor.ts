import ICollection from './ICollection';
import IDictionary from './IDictionary';
import IModel from './IModel';
import IType from './IType';

/**
 * MobX Collection Model constructor interface
 *
 * @interface IModelConstructor
 */
interface IModelConstructor {

  /**
   * Type of the model
   *
   * @type {IType}
   * @memberOf IModelConstructor
   */
  type: IType;

  /**
   * Atribute name for the type attribute
   *
   * @type {string}
   * @memberOf IModelConstructor
   */
  typeAttribute: string;

  /**
   * The attribute that should be used as the unique identifier
   *
   * @type {string}
   * @memberOf IModelConstructor
   */
  idAttribute: string;

  /**
   * Default values of model props
   *
   * @type {IDictionary}
   * @memberOf IModelConstructor
   */
  defaults: IDictionary;

  /**
   * Defines if the model should use autoincrement id if none is defined
   *
   * @type {boolean}
   * @memberOf IModelConstructor
   */
  enableAutoId: boolean;

  new (initialData?: object, collection?: ICollection): IModel;

  /**
   * Function used for generating the autoincrement IDs
   *
   * @returns {number|string} id
   *
   * @memberOf IModelConstructor
   */
  autoIdFunction(): number|string;
}

export default IModelConstructor;
