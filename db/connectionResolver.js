const createNamespace = require('cls-hooked').createNamespace;
const { getConnectionByTenant, getAdminConnection } = require('../connectionManager');
const dataValidation = require('../common/methods/dataValidation');

// Create a namespace for the application.
const nameSpace = createNamespace('unique context');
/**
 * Get the connection instance for the given tenant's name and set it to the current context.
 */
const resolveTenant = (req, res, next) => {
  let tenantIdentity = null;
  if(req.headers['authorization']){
    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);
    if(decodedjwt && decodedjwt.clientDbName){
      tenantIdentity = decodedjwt.clientDbName;
    } else {
      tenantIdentity = null;
    }
  } else {
    return res.status(403).json({ statusText: 'FAIL', statusValue: 403, message: `Please provide auth Token` });
  }

  if (dataValidation.isEmpty(tenantIdentity)) {
    return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `Please provide client's name to connect` });
  }
  const dbString = tenantIdentity;
  // Run the application in the defined namespace. It will contextualize every underlying function calls.
  nameSpace.run(() => {
    const tenantDbConnection = getConnectionByTenant(dbString);
    //console.log('resolveTenant tenantDbConnection');
    //console.log('resolveTenant tenantDbConnection', tenantDbConnection && tenantDbConnection.clientDbName);
    nameSpace.set('connection', tenantDbConnection);
    next();
  });
};

/**
 * Get the admin db connection instance and set it to the current context.
 */
const setAdminDb = (req, res, next) => {
  // Run the application in the defined namespace. It will contextualize every underlying function calls.
  nameSpace.run(() => {
    const adminDbConnection = getAdminConnection();
    console.log('setAdminDb adminDbConnection', adminDbConnection.name);
    nameSpace.set('connection', adminDbConnection);
    next();
  });
};

module.exports = { resolveTenant, setAdminDb };
