exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const propertyModel = await tenantDbConnection.model('attendences_data');
    for (const iterator of bodyData) {
      await propertyModel.findOneAndUpdate(
        { userId: iterator.userId, date: iterator.date }, { $set: iterator }, { upsert: true });
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};