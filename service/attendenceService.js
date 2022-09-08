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

exports.getUsersShiftData = async (tenantDbConnection, userData) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel
      .find({
        userId: { $in: userData.users },
        date: {
          $gte: userData.startDate, 
          $lte: userData.endDate
        }
      })
      .select({ userId: 1, shiftStart: 1, shiftEnd: 1, date: 1 });

    const newRes = res.reduce((r, a) => {
      r[a.userId] = r[a.userId] || [];
      r[a.userId].push(a);
      return r;
    }, Object.create(null));
    return { type: true, msg: 'Users shift data.', data: newRes };
  } catch (err) {
    console.log(err);
    return false;
  }
};
