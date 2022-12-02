/* eslint-disable no-extra-boolean-cast */
/* eslint-disable max-len */
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
    jsonData: jData,
    activityTime: timestamp
  });
  const addedData = await newActData.save();
  return addedData;
};

/*---------------------------*/
const generateExcelFile = async (dataArr, headArr, sheetName) => {
  try {
    const workbook = new Excel.Workbook();
    //const stream = new Stream.PassThrough();
    const worksheet = workbook.addWorksheet(sheetName);
    const excelName = crypto.randomBytes(8).toString('hex') + Date.now() + '.xlsx';
    const excelPath = 'uploads/temp_files/' + excelName;
    worksheet.columns = headArr;
    worksheet.addRows(dataArr);
    await workbook.xlsx.writeFile(excelPath);
    return { success: true, excelPath, excelName };
  } catch (err) {
    return { success: false, msg: err };
  }
};

/*---------------------------*/
const deleteTempFile = async (dir) => {
  try {
    if (fs.existsSync(`./${dir}`)) {
      fs.unlinkSync(`./${dir}`);
      return true;
    }
    return false;
  } catch (err) {
    return { success: false, msg: err };
  }
};

/*---------------------------*/
const readExcelFile = async (fileName) => {
  try {
    const excelData = [];
    const workbook = new Excel.Workbook();
    await workbook.csv.readFile(fileName);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return { success: false, err: 'CSV Sheet name is invalid' };
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > 1) {
        if (row.values.length > 2) {
          excelData.push(row.values.slice(1));
        } else {
          const fArr = row.values.slice(1);
          excelData.push(fArr[0].split(';'));
        }
      }
    });
    return { success: true, excelData };
  } catch (err) {
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

const getTimeDiff = (start, end, type) => {
  if (start && end && start != '' && end != '')
    return moment.unix(end).startOf(type).diff(moment.unix(start).startOf(type), type);
  return 0;
};

const checkForHalfDay = (shiftTime = 9 * 60, workingTime, type) => {
  if (shiftTime == 7 * 60) {
    if (workingTime >= 4 * 60 && workingTime <= 6 * 60) {
      return 'HALFDAY';
    } else if (workingTime > 6 * 60) {
      return (type != 'NA') ? type : 'PRESENT';
    } else {
      return 'ABSENT';
    }
  } else if (shiftTime == 8 * 60) {
    if (workingTime >= 4 * 60 && workingTime <= 7 * 60) {
      return 'HALFDAY';
    } else if (workingTime > 7 * 60) {
      return (type != 'NA') ? type : 'PRESENT';
    } else {
      return 'ABSENT';
    }
  } else if (shiftTime == 9 * 60) {
    if (workingTime >= 5 * 60 && workingTime <= 8 * 60) {
      return 'HALFDAY';
    } else if (workingTime > 8 * 60) {
      return (type != 'NA') ? type : 'PRESENT';
    } else {
      return 'ABSENT';
    }
  } else if (shiftTime == 10 * 60) {
    if (workingTime >= 5 * 60 && workingTime <= 8 * 60) {
      return 'HALFDAY';
    } else if (workingTime > 8 * 60) {
      return (type != 'NA') ? type : 'PRESENT';
    } else {
      return 'ABSENT';
    }
  } else if (shiftTime == 12 * 60) {
    if (workingTime >= 5 * 60 && workingTime <= 10 * 60) {
      return 'HALFDAY';
    } else if (workingTime > 10 * 60) {
      return (type != 'NA') ? type : 'PRESENT';
    } else {
      return 'ABSENT';
    }
  } else {
    return 'N/A';
  }
};

const getOverTimeCalculation = (shiftStart, shiftEnd, checkIn, checkout) => {
  //all input must be in minutes
  const overtimeData = [
    { rangeStartMin: 0, rangeEndMin: 30, rangeHr: 0 },
    { rangeStartMin: 31, rangeEndMin: 90, rangeHr: 1 },
    { rangeStartMin: 91, rangeEndMin: 150, rangeHr: 2 },
    { rangeStartMin: 151, rangeEndMin: 210, rangeHr: 3 },
    { rangeStartMin: 211, rangeEndMin: 270, rangeHr: 4 },
    { rangeStartMin: 271, rangeEndMin: 330, rangeHr: 5 },
    { rangeStartMin: 331, rangeEndMin: 390, rangeHr: 6 },
    { rangeStartMin: 391, rangeEndMin: 450, rangeHr: 7 },
    { rangeStartMin: 451, rangeEndMin: 510, rangeHr: 8 },
    { rangeStartMin: 511, rangeEndMin: 570, rangeHr: 9 },
    { rangeStartMin: 571, rangeEndMin: 630, rangeHr: 10 },
    { rangeStartMin: 631, rangeEndMin: 690, rangeHr: 11 },
    { rangeStartMin: 691, rangeEndMin: 720, rangeHr: 12 }
  ];
  if (!Number(shiftStart) > 0 || !Number(shiftEnd) > 0 || !Number(checkIn) > 0 || !Number(checkout) > 0) {
    return 'N/A';
  }
  const totalShiftMin = getTimeDiff(shiftStart, shiftEnd, 'minutes');
  const totalWorkingMin = getTimeDiff(checkIn, checkout, 'minutes');
  if (totalShiftMin > totalWorkingMin) return 'N/A';
  const totalTimeDiff = totalWorkingMin - totalShiftMin;
  let chkOvertime = null;
  overtimeData.forEach((a) => {
    if (a.rangeStartMin <= totalTimeDiff) {
      chkOvertime = a;
    }
  });
  if (!chkOvertime) return 'N/A';
  return chkOvertime.rangeHr;
};

const autoCalculateStatus = (shiftStart1, shiftEnd1, checkIn1, checkOut1, isAutoChkOut) => {
  // eslint-disable-next-line prefer-const
  let superStatus = 'N/A', subStatus = 'N/A';
  if (!shiftStart1 && !shiftEnd1 && !checkIn1 && !checkOut1) {
    return { superStatus, subStatus };
  }
  const shiftStart = !!Number(shiftStart1) ? shiftStart1 : 0;
  const shiftEnd = !!Number(shiftEnd1) ? shiftEnd1 : 0;
  const checkIn = !!Number(checkIn1) ? checkIn1 : 0;
  const checkOut = !!Number(checkOut1) ? checkOut1 : 0;
  //shiftDiff is optional in case if its not avl pass undefined in checkForHalfDay()
  // const shiftDiff = moment.unix(shiftEnd).startOf('hour').diff(moment.unix(shiftStart).startOf('hour'), 'hour');
  // const workingHoursDiff = moment.unix(checkOut).startOf('hour').diff(moment.unix(checkIn).startOf('hour'), 'hour');
  const shiftDiffMin = moment.unix(shiftEnd).startOf('minutes').diff(moment.unix(shiftStart).startOf('minutes'), 'minutes');
  const workingHoursDiffMin = moment.unix(checkOut).startOf('minutes').diff(moment.unix(checkIn).startOf('minutes'), 'minutes');
  const checkInDate = moment.unix(checkIn).format('YYYY/MM/DD HH:mm:ss');
  const nextDayTime = moment(checkInDate, 'YYYY/MM/DD HH:mm:ss').add(1, 'd');
  nextDayTime.set({ hour: 23, minute: 59, second: 59, millisecond: 0 });
  const nextDayTimeStamp = moment(nextDayTime, 'YYYY/MM/DD HH:mm:ss').unix();
  const currentTimeStamp = moment().unix();
  /*------Week Off------*/
  if (shiftStart == -1 && shiftEnd == -1 && checkIn && isAutoChkOut == 'AUTOCHECKOUT') {
    return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'WEEK OFF' };
  }
  if (shiftStart == -1 && shiftEnd == -1 && checkIn && !checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'WEEK OFF' };
    } else {
      return { superStatus: 'PRESENT', subStatus: 'SP', overTimeHours: 0, msg: 'WEEK OFF' };
    }
  }
  if (shiftStart == -1 && shiftEnd == -1 && checkIn && checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'WOP', overTimeHours: 0, msg: 'WEEK OFF' };
    } else {
      const chkHalfDay = checkForHalfDay(undefined, workingHoursDiffMin, 'WOP');
      return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: 'WEEK OFF' };
    }
  }
  if (shiftStart == -1 && shiftEnd == -1 && !checkIn && !checkOut) {
    return { superStatus: 'ABSENT', subStatus: 'WEEKLY OFF', overTimeHours: 0, msg: 'WEEK OFF' };
  }
  /*------WFH------*/
  if (shiftStart == -2 && shiftEnd == -2 && checkIn && isAutoChkOut == 'AUTOCHECKOUT') {
    return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'WFH' };
  }
  if (shiftStart == -2 && shiftEnd == -2 && checkIn && !checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'WFH' };
    } else {
      return { superStatus: 'PRESENT', subStatus: 'SP', overTimeHours: 0, msg: 'WFH' };
    }
  }
  if (shiftStart == -2 && shiftEnd == -2 && checkIn && checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'WFH' };
    } else {
      const chkHalfDay = checkForHalfDay(undefined, workingHoursDiffMin, 'NA');
      return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: 'WFH' };
    }
  }
  if (shiftStart == -2 && shiftEnd == -2 && !checkIn && !checkOut) {
    return { superStatus: 'PRESENT', subStatus: 'WFH', overTimeHours: 0, msg: 'WFH' };
  }
  /*------Leave------*/
  if (shiftStart == -3 && shiftEnd == -3 && checkIn && isAutoChkOut == 'AUTOCHECKOUT') {
    return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'LEAVE' };
  }
  if (shiftStart == -3 && shiftEnd == -3 && checkIn && !checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'LEAVE' };
    } else {
      return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'LEAVE' };
    }
  }
  if (shiftStart == -3 && shiftEnd == -3 && checkIn && checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'LEAVE' };
    } else {
      const chkHalfDay = checkForHalfDay(undefined, workingHoursDiffMin, 'NA');
      return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: 'LEAVE' };
    }
  }
  if (shiftStart == -3 && shiftEnd == -3 && !checkIn && !checkOut) {
    return { superStatus: 'ABSENT', subStatus: 'CL', overTimeHours: 0, msg: 'LEAVE' };
  }
  /*------Holiday------*/
  if (shiftStart == -4 && shiftEnd == -4 && checkIn && isAutoChkOut == 'AUTOCHECKOUT') {
    return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'HOLIDAY' };
  }
  if (shiftStart == -4 && shiftEnd == -4 && checkIn && !checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'HOLIDAY' };
    } else {
      return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'HOLIDAY' };
    }
  }
  if (shiftStart == -4 && shiftEnd == -4 && checkIn && checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: 'HOLIDAY' };
    } else {
      const chkHalfDay = checkForHalfDay(undefined, workingHoursDiffMin, 'HOP');
      return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: 'HOLIDAY' };
    }
  }
  if (shiftStart == -4 && shiftEnd == -4 && !checkIn && !checkOut) {
    return { superStatus: 'ABSENT', subStatus: 'HO', overTimeHours: 0, msg: 'HOLIDAY' };
  }
  /*-------------------*/
  if (shiftStart > 0 && shiftEnd > 0 && checkIn && isAutoChkOut == 'AUTOCHECKOUT') {
    return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: '1' };
  }
  if (shiftStart && shiftEnd && checkIn && !checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: '1' };
    } else {
      return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: '1' };
    }
  }
  if (shiftStart && shiftEnd && checkIn && checkOut) {
    const chkHalfDay = checkForHalfDay(shiftDiffMin, workingHoursDiffMin, 'NA');
    return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: '2.1' };
    // if(currentTimeStamp < nextDayTimeStamp){
    //     const overTime = getOverTimeCalculation(shiftStart, shiftEnd, checkIn, checkOut);
    //     return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: overTime, msg: '2' };
    // } else {
    //     const chkHalfDay = checkForHalfDay(shiftDiffMin, workingHoursDiffMin, 'NA');
    //     return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: '2.1' };
    // }
  }
  if (shiftStart && shiftEnd && !checkIn && !checkOut) {
    return { superStatus: 'ABSENT', subStatus: 'ABSENT', overTimeHours: 0, msg: 'Absent' };
  }
  if (!shiftStart && !shiftEnd && checkIn && !checkOut) {
    if (shiftStart == 0 && shiftEnd == 0 && checkIn && isAutoChkOut == 'AUTOCHECKOUT') {
      return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: 'WEEK OFF SP' };
    }
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: '3' };
    } else {
      return { superStatus: 'ABSENT', subStatus: 'SP', overTimeHours: 0, msg: '3' };
    }
  }
  if (!shiftStart && !shiftEnd && checkIn && checkOut) {
    if (currentTimeStamp < nextDayTimeStamp) {
      return { superStatus: 'PRESENT', subStatus: 'PRESENT', overTimeHours: 0, msg: '4' };
    } else {
      const chkHalfDay = checkForHalfDay(shiftDiffMin, workingHoursDiffMin, 'NA');
      return { superStatus: 'PRESENT', subStatus: chkHalfDay, overTimeHours: 0, msg: '4' };
    }
  }
  if (!shiftStart && !shiftEnd && !checkIn && !checkOut) {
    return { superStatus: 'ABSENT', subStatus: 'ABSENT', overTimeHours: 0, msg: '5' };
  }
  return { superStatus: 'NA', subStatus: 'NA', overTimeHours: 0, msg: '6' };
};

module.exports = {
  createUserActivity,
  generateExcelFile,
  deleteTempFile,
  readExcelFile,
  checkForHalfDay,
  getOverTimeCalculation,
  autoCalculateStatus
};