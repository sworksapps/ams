exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const propertyModel = await tenantDbConnection.model('attendences_data');
    for (const iterator of bodyData) {
      await propertyModel.findOneAndUpdate(
        { userId: iterator.userId, date: iterator.date },
        { $set: iterator },
        { upsert: true }
      );
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.getUsersShiftData = async (tenantDbConnection, userData, deptId, startDate, endDate) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel
      .find({
        deptId: deptId,
        userId: { $in: userData.users },
        date: {
          $gte: startDate, 
          $lte: endDate
        }
      })
      .select({ userId: 1, shiftStart: 1, shiftEnd: 1, date: 1, locationId: 1, deptId: 1 });

    const key = 'userId';

    let refData = [...new Map(res.map(item =>
      [item[key], item])).values()];

    refData = refData.map( (v) => {
      return {
        user_id: v.userId,
        dept_id: v.deptId,
        dataArray: []
      };
    });

    for (let index = 0; index < res.length; index++) {
      const element = res[index];
      for (let j = 0; j < refData.length; j++) {
        const ele = refData[j];
        if(element.userId == ele.user_id) {
          ele.dataArray.push({
            'shift_date': element.date,
            'shift_start_time': element.shiftStart,
            'shift_end_time': element.shiftEnd
          });
        }
      }
    }

    return { type: true, msg: 'Users shift data.', refData };
  } catch (err) {
    console.log(err);
    return false;
  }
};
