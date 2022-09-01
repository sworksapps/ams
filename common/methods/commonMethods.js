const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Kolkata');

const Excel = require('exceljs');
const crypto = require('crypto');
const fs = require('fs');

/*
*-------Common methods Start-------------
*/
const createUserActivity = async (dbConnection, userId, acModule, acData, jData) => {

  const userActivityModel = await dbConnection.model('all_users_activities');
  const timestamp = moment().format('DD-MM-YYYY, hh:mm A');
  const newActData = new userActivityModel({
    userId: userId,
    module: acModule,
    action: acData,
    jsonData:jData,
    activityTime: timestamp
  });
  const addedData = await newActData.save();
  return addedData;
};

/*---------------------------*/
const generateExcelFile = async (dataArr, headArr, sheetName) => {
  try{
    const workbook = new Excel.Workbook();
    //const stream = new Stream.PassThrough();
    const worksheet = workbook.addWorksheet(sheetName);
    const excelName = crypto.randomBytes(8).toString('hex') + Date.now() + '.xlsx';
    const excelPath = 'uploads/temp_files/' + excelName;
    worksheet.columns = headArr;
    worksheet.addRows(dataArr);
    await workbook.xlsx.writeFile(excelPath);
    return { success: true, excelPath, excelName };
  } catch(err){
    return { success: false, msg: err };
  }
};

/*---------------------------*/
const deleteTempFile = async (dir) => {
  try{
    if (fs.existsSync(`./${dir}`)) {
      fs.unlinkSync(`./${dir}`);
      return true;
    } 
    return false;
  } catch(err){
    return { success: false, msg: err };
  }
};

/*---------------------------*/
const readExcelFile = async (fileName) => {
  try{
    const excelData = [];
    const workbook = new Excel.Workbook();
    await workbook.csv.readFile(fileName);
    const worksheet = workbook.getWorksheet(1);
    if(!worksheet) return { success: false, err: 'CSV Sheet name is invalid' };
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if(rowNumber > 1){
        if(row.values.length > 2){
          excelData.push(row.values.slice(1));
        } else {
          const fArr = row.values.slice(1);
          excelData.push(fArr[0].split(';'));
        }
      }
    });
    return { success: true, excelData };
  } catch(err){
    return { success: false, err };
  }
};

/*---------------------------*/
// const readExcelFileBuffer = async (fileName) => {
//   try{
//     const csvData=[];
//     //fs.createReadStream(fileName)
//     fileName.pipe(parse({delimiter: ','}))
//       .on('data', function(csvrow) {
//         console.log(csvrow);
//         csvData.push(csvrow);        
//       })
//       .on('end',function() {
//         console.log(csvData);
//       });
    
//     return { success: true, excelData: '' };
//   } catch(err){
//     return { success: false, err };
//   }
// };
/*
*------------------------------
*/
module.exports = {
  createUserActivity,
  generateExcelFile,
  deleteTempFile,
  readExcelFile
};