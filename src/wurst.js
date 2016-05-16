const path = require('path');
const glob = require('glob');
const Joi = require('joi');

/**
 * @public
 *
 * @classdesc
 * Autoload and prefix routes
 */
class Wurst {
  static schemata = {
    options: Joi.object({
      routes: Joi.string().required(),
      ignore: [
        Joi.string(),
        Joi.array().items(Joi.string()),
      ],
    }),
    routeObject: Joi.object({
      path: Joi.string().required(),
      method: Joi.string().required(),
    }).unknown(true),
  };

  server;
  options;

  /**
   * @constructor
   * @public
   *
   * @description
   * Construct a new instance
   *
   * @param {Object} server The corresponding server object
   * @param {Object} options The passed plugin options
   */
  constructor(server, options) {
    this.server = server;
    this.options = options;

    this.validateOptions();
    this.getFilePaths().forEach(this::this.registerRoutes);
  }

  /**
   * @function
   * @public
   *
   * @description
   * Get list of file paths based on passed options
   *
   * @returns {Array.<?string>} List of file paths
   */
  getFilePaths() {
    return glob.sync('**/*.js', {
      nodir: true,
      cwd: this.options.routes,
      ignore: this.options.ignore,
    });
  }

  /**
   * @function
   * @public
   *
   * @description
   * Split file path and drop file name
   *
   * @param {string} filePath The file path to be split
   * @returns {Array.<?string>} List of directories
   */
  getPathTree(filePath) {
    const splitPath = filePath.split(path.sep);
    splitPath.pop();

    return splitPath;
  }

  /**
   * @function
   * @public
   *
   * @description
   * Prefix the path for each of the passed routes
   *
   * @param {Array.<?Object> | Object} routes The list of routes
   * @param {string} filePath The related file path
   * @returns {Array.<?Object>} The list of routes with prefixed paths
   */
  prefixRoutes(routes, filePath) {
    if (!Array.isArray(routes)) {
      routes = Array.of(routes);
    }

    const pathTree = this.getPathTree(filePath);

    if (pathTree.length !== 0) {
      routes.forEach(route => {
        this.validateRouteObject(route);
        route.path = `/${pathTree.join('/')}${route.path}`;
      });
    }

    return routes;
  }

  /**
   * @function
   * @public
   *
   * @description
   * Load and register routes
   *
   * @param {string} filePath The file path to be loaded and registered
   */
  registerRoutes(filePath) {
    const modulePath = path.join(this.options.routes, filePath);
    const routes = require(modulePath);
    const prefixedRoutes = this.prefixRoutes(routes, filePath);

    this.server.route(prefixedRoutes);
    delete require.cache[modulePath];
  }

  /**
   * @function
   * @public
   *
   * @description
   * Validate plugin options based on defined schema
   */
  validateOptions() {
    Joi.assert(this.options, Wurst.schemata.options, 'Invalid options');
  }

  /**
   * @function
   * @public
   *
   * @description
   * Validate route configuration object based on defined schema
   *
   * @param {Object} routeObject The route object to be validated
   */
  validateRouteObject(routeObject) {
    Joi.assert(routeObject, Wurst.schemata.routeObject, 'Invalid route object');
  }
}

module.exports = Wurst;
