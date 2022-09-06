const getNamespace = require('cls-hooked').getNamespace;

const { initAdminDbConnection } = require('./db/adminDbConnect');
const { initTenantDbConnection } = require('./db/clientDbConnect');
const clientDbService = require('./db/clientDbService');

let connectionMap;
let adminDbConnection;
/**
 * Create knex instance for all the tenants defined in common database and store in a map.
 **/
const connectAllDb = async () => {
  let tenants;
  const ADMIN_DB_URI = `${process.env.BASE_DB_URI}/${process.env.MASTER_DB_NAME}`;
  adminDbConnection = await initAdminDbConnection(ADMIN_DB_URI);
  //console.log('connectAllDb adminDbConnection', adminDbConnection);
  console.log('connectAllDb adminDbConnection');
  try {
    tenants = await clientDbService.getAllTenants(adminDbConnection);
    console.log('connectAllDb tenants');
    //console.log('connectAllDb tenants', tenants);
  } catch (e) {
    console.log('connectAllDb error', e);
    return;
  }

  // console.log(tenants);

  connectionMap = tenants
    .map(tenant => {
      return {
        [tenant.clientDbName]: initTenantDbConnection(`${process.env.BASE_DB_URI}/${tenant.clientDbName}`)
      };
    })
    .reduce((prev, next) => {
      return Object.assign({}, prev, next);
    }, {});
  console.log('connectAllDb connectionMap');
  // console.log('connectAllDb connectionMap', connectionMap);
};

/**
 * Get the connection information (knex instance) for the given tenant's slug.
 */
const getConnectionByTenant = tenantName => {
  //console.log(`Getting connection for ${tenantName}`);
  if (connectionMap) {
    return connectionMap[tenantName];
  }
};

/**
 * Get the admin db connection.
 */
const getAdminConnection = () => {
  if (adminDbConnection) {
    console.log('Getting adminDbConnection');
    return adminDbConnection;
  }
};

/**
 * getNamespace from 'continuation-local-storage'. This will let us get / set any
 * information and binds the information to current request context.
 */
const getConnection = () => {
  const nameSpace = getNamespace('unique context');
  const conn = nameSpace.get('connection');
  if(conn){
    return conn;
  } else {
    console.log(`The provided Client is not available`);
    return null;
  }

  // if (!conn) {
  //   throw new Error('Connection is not set for any tenant database');
  // }
};

module.exports = {
  connectAllDb,
  getAdminConnection,
  getConnection,
  getConnectionByTenant
};
