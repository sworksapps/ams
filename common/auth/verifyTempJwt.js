const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('config');

/*
*-------------------------------
*/
module.exports = async (req, res, next) => {
  const token = req.headers['authorization'];
  if(!token) return res.status(403).send({statusText: 'FAIL', statusValue: 403, message: 'UNAUTHORIZED'});
  jwt.verify(token, config.get('jwtSecret.user'), (err, decoded) => {

    if(err) return res.status(401).send({statusText: 'FAIL', statusValue: 401, message: 'Failed to authenticate'});

    if(!mongoose.Types.ObjectId.isValid(decoded.uid)) 
      return res.status(401).send({statusText: 'FAIL', statusValue: 401, message: 'Failed to authenticate Token.'});

    if(decoded.uemail != 'NA'){
      return res.status(401).send({statusText: 'FAIL', statusValue: 401, message: 'Failed to authenticate Token.'});   
    }

    req.decoded = decoded;
    next();
  });

};