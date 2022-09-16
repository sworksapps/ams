const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Kolkata');
const crypto = require('crypto');
const { Buffer } = require('buffer');

// is empty
const isEmpty = (value) => {
  return typeof value == 'string' && !value.trim() || typeof value == 'undefined' || value === null;
};

const isNumber = (n) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

const convertToSlug = (Text) => {
  return Text.toLowerCase().replace(/&/g, 'and').replace(/ /g, '-').replace(/[^\w-]+/g, '');
};

const convertToUpperSlug = (Text) => {
  return Text.toUpperCase().replace(/&/g, '-and-').replace(/ /g, '_').replace(/[^\w-]+/g, '');
};

const isMongoId = (mId) => {
  if(!mId){ return false; }
  if (mId.match(/^[0-9a-fA-F]{24}$/)) { return true; } else { return false; }
};

const escapeRegExp = (str) => {
  if (str) {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
  } else {
    return str;
  }
};

const convertToSlugMain = (data) => {
  const a = 'àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
  const b = 'aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
  const p = new RegExp(a.split('').join('|'), 'g');
  return(data.toString().toLowerCase()
    .replace(/\s+/g, '-').replace(p, c => b.charAt(a.indexOf(c))).replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, ''));
};

const convertToReverseSlug = (slug) => {
  const words = slug.split('-');
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    words[i] = word.charAt(0).toUpperCase() + word.slice(1);
  }
  return words.join(' ');
};

const generateRandomString = (len) =>{
  let text = '';
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < len; i++){
    text += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return text;
};

const generateReferralString = () =>{
  const thirdPart = Math.floor((Math.random()*10));
  let firstPart = (Math.random() * 46656) | 0;
  let secondPart = (Math.random() * 46656) | 0;
  firstPart = ('000' + firstPart.toString(36)).slice(-3);
  secondPart = ('000' + secondPart.toString(36)).slice(-3);
  const refId = firstPart + thirdPart + secondPart;
  return refId;
};

const chkBusinessTime = (openTime, closeTime) => {
  const currentTime1 = moment().format('HH:mm');
  const currentTime = moment(currentTime1, 'HH:mm');
  const startTime = moment(openTime, 'HH:mm');
  const endTime = moment(closeTime, 'HH:mm');
  if ((startTime.hour() >= 12 && endTime.hour() <= 12) || endTime.isBefore(startTime)) {
    endTime.add(1, 'days');
    if (currentTime.hour() <= 12) {
      currentTime.add(1, 'days');
    }
  }
  const isBetween = currentTime.isBetween(startTime, endTime);
  return isBetween;
};

//----------------------------------
const ENCRYPTION_KEY = 'yy1blGi9ievxcdcsCbA9Ix4zOKZbkAj3';
const IV_LENGTH = 16;
//const randomString = crypto.randomBytes(16).toString('hex'); //32 char random Str

const encryptString = (text) => {
  try{
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch(err){
    console.log(err);
  }
};
const decryptString = (text) => {
  try{
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch(err){
    console.log(err);
  }
};

const parseJwt = (token) => {
  try{
    if(!token || token == 'undefined' || token == 'null' || token.length < 20){ 
      return false; 
    }
    const tokenArr = token.split('.');
    if(tokenArr.length != 3){
      return false;
    }
    const base64Payload = tokenArr[1];
    const jsonPayload = Buffer.from(base64Payload, 'base64');
    return JSON.parse(jsonPayload);
  } catch(err){
    console.log(err);
    return false;
  }
};

function ciEquals(a, b) {         //case ignore search string
  return typeof a === 'string' && typeof b === 'string'
    ? a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
    : a === b;
}

function mysql_real_escape_string (str) {
  if (typeof str != 'string')
    return str;

  // eslint-disable-next-line no-control-regex 
  const retStr = str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, function (char) {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case '\'':
      case '\\':
      case '%':
        return '\\'+char; // prepends a backslash to backslash, percent,
                                // and double/single quotes
    }
  });
  return retStr.trim();
}

/*---------------------------*/
const getAllNumbersBetween = (x , y, prefix) => {
  const numbers = [];
  for (let i = x; i <= y; i++) {
    let widthNew = 3;
    widthNew -= i.toString().length;
    if(widthNew > 0){
      const num = new Array(widthNew + (/\./.test(i) ? 2 : 1)).join('0') + i;
      numbers.push(prefix +''+ num);
    } else {
      numbers.push(prefix +''+ i);
    }
  }
  return numbers;
};
function isLatitude(lat) {

  return isFinite(lat) && Math.abs(lat) <= 90;

}

function isLongitude(lng) {

  return isFinite(lng) && Math.abs(lng) <= 180;

}
/*
*-----------------------------------------------------------------
*/
module.exports = {
  isEmpty,
  isNumber,
  convertToSlug,
  convertToSlugMain,
  convertToReverseSlug,
  convertToUpperSlug,
  isMongoId,
  escapeRegExp,
  generateRandomString,
  generateReferralString,
  chkBusinessTime,
  encryptString,
  decryptString,
  parseJwt,
  ciEquals,
  mysql_real_escape_string,
  getAllNumbersBetween,
  isLatitude,
  isLongitude
};
