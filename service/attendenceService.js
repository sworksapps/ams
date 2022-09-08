const mongoose = require('mongoose');

/* ---------------get daily report----------------------*/
exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const attModel = await tenantDbConnection.model('attendences_data');
    for (const iterator of bodyData) {
      await attModel.findOneAndUpdate(
        { userId: iterator.userId, date: iterator.date }, { $set: iterator }, { upsert: true });
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

/* ---------------get daily report----------------------*/
exports.fetchAllPropertyData = async (dbConnection, limit, page, sort_by, search, filter, dateChk) => {
  try {
    const dbQuery = [];
    const dbQuery1 = [];
    const attModel = await dbConnection.model('attendences_data');

    if (filter) {
      filter = JSON.parse(filter);

      if (filter.propertyName) {
        dbQuery.push({ propertyName: filter.propertyName });
      }

      if (filter.propertyCity) {
        dbQuery.push({ propertyCity: mongoose.Types.ObjectId(filter.propertyCity) });
      }

      if (filter.propertyGrade) {
        dbQuery.push({ propertyGrade: mongoose.Types.ObjectId(filter.propertyGrade) });
      }

      if (filter.regionId) {
        dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      }

      if (filter.propertyStage) {
        dbQuery.push({ propertyStage: filter.propertyStage });
      }

      if (filter.regionId) {
        dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      }

      if (filter.spocEmail) {
        filter.spocEmail.forEach(element => {
          if (element)
            dbQuery1.push({ 'spocData.spocEmail': element.trim() });
        });
      }
    }


    if (search) {
      const dateArr = search.replace(/\\\//g, '/').split('/');

      if (dateArr.length === 3 && dateChk === true) {
        const dateData = new Date(`${dateArr[2]}-${dateArr[1]}-${dateArr[0]}`);
        dbQuery1.push({
          createdAt: {
            $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
            $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          }
        },
        {
          proposalDate: {
            $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
            $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          }
        });
      } 
      else {
        dbQuery1.push(
          { propertyName: { $regex: `.*${search}.*`, $options: 'i' } },
          { area: { $regex: `.*${search}.*`, $options: 'i' } },
          { city: { $regex: `.*${search}.*`, $options: 'i' } },
          { grade: { $regex: `.*${search}.*`, $options: 'i' } },
          { propertyCreatedBy: { $regex: `.*${search}.*`, $options: 'i' } },
          { propertyStage: { $regex: `.*${search}.*`, $options: 'i' } },
          { spocName: { $regex: `.*${search}.*`, $options: 'i' } }
        );
      }
    }

    if (sort_by === 'propertyName')
      sort_by = { propertyName: 1 };
    else if (sort_by === 'area')
      sort_by = { areaNum: -1 };
    else if (sort_by === 'proposalDate')
      sort_by = { proposalDate: -1 };
    else if (sort_by === 'city')
      sort_by = { city: 1 };
    else if (sort_by === 'grade')
      sort_by = { grade: 1 };
    else if (sort_by === 'propertyStatus')
      sort_by = { propertyStatus: 1 };
    else
      sort_by = { proposalDate: -1 };

    const query = [
      {
        $lookup: {
          from: 'all_city_by_clients',
          localField: 'propertyCity',
          foreignField: '_id',
          as: 'city',
        },
      },
      {
        $lookup: {
          from: 're_property_grade_datas',
          localField: 'propertyGrade',
          foreignField: '_id',
          as: 'grade',
        },
      },
      {
        $lookup: {
          from: 're_region_datas',
          localField: 'locationDetail.region',
          foreignField: '_id',
          as: 'region',
        },
      },
      {
        '$project': {
          '_id': 1,
          'propertyCity': 1,
          'regionId': '$locationDetail.region',
          'region': { '$arrayElemAt': ['$region.regionName', 0] },
          'propertyCreatedBy': 1,
          'propertyName': 1,
          'area': {
            $toString: '$microMarketDetails.averageDealSizeSft'
          },
          'areaNum': '$microMarketDetails.averageDealSizeSft',
          'proposalDate': 1,
          'city': { $toLower: { '$arrayElemAt': ['$city.cityName', 0] } },
          'grade': { $toLower: { '$arrayElemAt': ['$grade.gradeName', 0] } },
          'devSpocName': { $toLower: '$devSpocName' },
          'propertyStatus': 1,
          'propertyStage': 1,
          'propertyStageNum': 1,
          'spocData': 1,
          'spocName': '$spocData.spocName',
          'createdAt': 1,
          'propertyGrade': 1,
        },
      },
      {
        $match: {}
      },
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[4].$match.$and = dbQuery;

    if (dbQuery1.length > 0)
      query[4].$match.$or = dbQuery1;

    const propertyData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
    const total = await attModel.aggregate([...query, { $count: 'totalCount' }])
      .then(res => res.length > 0 ? res[0].totalCount : 0);

    return { propertyData, total };
  } catch (err) {
    console.log(err);
    return false;
  }
};