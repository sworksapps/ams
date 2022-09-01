
// const otpGenerator = require('otp-generator');
// const mongoose = require('mongoose');

// /*
// *------------User Service------------
// */
// exports.getLoginUser = async (tenantDbConnection, uData) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     let userData = await AllUsers.findOne({ userEmail: uData.email });
//     if(userData){
//       const otp = await otpGenerator.generate(6, { alphabets:false, upperCase: false, specialChars: false });
//       const query = { _id: userData._id };
//       userData = await AllUsers.findOneAndUpdate(query, { userPassword: otp },{ new: true, });
//     }
//     return userData;
//   } catch (err){
//     return false;
//   }
// };

// exports.validateOtp = async (tenantDbConnection, uData) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     const userData = await AllUsers.findOne({ userEmail: uData.email,userPassword:uData.password }).lean();
//     return userData;
//   } catch (err){
//     return false;
//   }
// };

// //------------------------------
// exports.createClientUser = async (tenantDbConnection, formData) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     // const newUser = await new AllUsers(formData).save();
//     const editUser = await new AllUsers(formData).save();
//     return editUser;
//   } catch (err){
//     return err.code;
//   }
// };

// //------------------------------
// exports.updateClientUser = async (tenantDbConnection, query, formData) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     await AllUsers.findOneAndUpdate(query, formData,{ new: true, }).then(function (response,err) {
//       return response;
//     });
  
//   } catch (err){
//     return err.code;
//   }
// };

// //----------------------------
// exports.getClientsMembers = async (tenantDbConnection, formData) => {
//   console.log(formData);
//   try{

//     const { search, status, type } = formData;
//     const rgx = (pattern) => new RegExp(`.*${pattern}.*`);

//     const dbQuery = {};
//     let sortBy = { createdAt: -1  };

//     if(formData.status){
//       dbQuery.userStatus=formData.status;
//     }

//     if(formData.type){
//       dbQuery.userType = formData.type;
//     }

//     if(formData.name){
//       const nameRgx = rgx(formData.name);
//       dbQuery.fullName = { $regex: nameRgx, $options: 'i' };
//     }

//     if(formData.email){
//       const emailRgx = rgx(formData.email);
//       dbQuery.userEmail = { $regex: emailRgx, $options: 'i' };
//     }

//     if(formData.phone){
//       const phoneRgx = rgx(formData.phone);
//       dbQuery.userMobile = { $regex: phoneRgx, $options: 'i' };
//     }

//     if(formData.cityId){
//       dbQuery.userCityId = mongoose.Types.ObjectId(formData.cityId);
//     }

//     if(formData.locationId){
//       dbQuery.userLocationId = mongoose.Types.ObjectId(formData.locationId);
//     }

//     if(formData.roleId){
//       dbQuery.userRoleId = mongoose.Types.ObjectId(formData.roleId);
//     }

//     if(formData.deptId){
//       dbQuery.userDeptId = mongoose.Types.ObjectId(formData.deptId);
//     }

//     if(formData.vaccinated){
//       dbQuery.isVaccinated = formData.vaccinated;
//     }
//     dbQuery.userType={$ne:'5'};

//     if (formData.sort_by == 'name') {
//       sortBy = { insensitive: 1 };
//     }

//     if (formData.sort_by == 'email') {
//       sortBy = { userEmail: 1 };
//     }

//     if (formData.sort_by == 'phone') {
//       sortBy = { userMobile: 1 };
//     }

//     if (formData.sort_by == 'status') {
//       sortBy = { userStatus: 1 };
//     }
  
//     const limit = Math.abs(formData.limit) || 10; 
//     const page = (Math.abs(formData.page) || 1) - 1;
//     const skip = parseInt(limit*page);
//     const stsearch = new RegExp('\\b'+search+'\\b','i');
  
//     const searchRgx = rgx(search.trim());
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
  
//     const userData = await AllUsers
//       .aggregate([{$project:{'fullName':{$concat:['$userFirstName',' ','$userLastName']},userMobile: 1,
//         userEmail: 1,userCityId:1,userLocationId:1,userFloorId:1,userType:1,
//         userStatus:1,isVaccinated:1,userRoleId:1,userDeptId:1,createdAt:1,'insensitive': { '$toLower': '$userFirstName' },status:
//   {
//     $cond: { if: { $eq: [ '$userStatus', '1' ] }, then: 'Active', else: 'Inactive' }
//   }}},
//       {
//         $lookup:
//                        {
//                          from: 'all_building_by_clients',
//                          localField: 'userLocationId',
//                          foreignField: '_id',
//                          as: 'buildingName'
//                        }
                       
//       },
//       {
//         $lookup:
//                       {
//                         from: 'all_floor_by_clients',
//                         localField: 'userFloorId',
//                         foreignField: '_id',
//                         as: 'floorName'
//                       }
                      
//       },
//       {
//         $lookup:
//                        {
//                          from: 'spoc_roles_by_clients',
//                          localField: 'userRoleId',
//                          foreignField: '_id',
//                          as: 'roleName'
//                        }
                       
//       },
//       {
//         $lookup:
//                        {
//                          from: 'all_departments_by_clients',
//                          localField: 'userDeptId',
//                          foreignField: '_id',
//                          as: 'departmentName'
//                        }
                       
//       },
//       {
//         $set: {
//           buildingName: { $arrayElemAt: ['$buildingName.buildingName', 0] },
//           floorName: { $arrayElemAt: ['$floorName.floorName', 0] },
//           roleName: { $arrayElemAt: ['$roleName.roleName', 0] },
//           departmentName: { $arrayElemAt: ['$departmentName.departmentName', 0] }
//         }
//       },
//       {$match:{$or:[{'fullName':{ $regex: searchRgx, $options: 'i' }},
//         {userMobile:{ $regex: searchRgx, $options: 'i' }},
//         {userEmail:{ $regex: searchRgx, $options: 'i' }},
//         {buildingName:{ $regex: searchRgx, $options: 'i' }},
//         {floorName:{ $regex: searchRgx, $options: 'i' }},
//         {roleName:{ $regex: searchRgx, $options: 'i' }},
//         {departmentName:{ $regex: searchRgx, $options: 'i' }},
//         {status:{ '$regex': stsearch }}
//       ]}},
//       { $match: dbQuery },
//       { $sort : sortBy },
//       { $skip : skip },
//       { $limit : limit }
                  

//       ]);

//     return userData;

//   } catch (err){
//     return err;
//   }
// };

// //------------------------

// exports.getMembersKpi = async (tenantDbConnection, formData) => {
//   try{

//     const { search, status, type } = formData;
//     const rgx = (pattern) => new RegExp(`.*${pattern}.*`);

//     const dbQuery = {};

//     if(formData.status){
//       dbQuery.userStatus=formData.status;
//     }

//     if(formData.type){
//       dbQuery.userType = formData.type;
//     }

//     if(formData.name){
//       const nameRgx = rgx(formData.name);
//       dbQuery.fullName = { $regex: nameRgx, $options: 'i' };
//     }

//     if(formData.email){
//       const emailRgx = rgx(formData.email);
//       dbQuery.userEmail = { $regex: emailRgx, $options: 'i' };
//     }

//     if(formData.phone){
//       const phoneRgx = rgx(formData.phone);
//       dbQuery.userMobile = { $regex: phoneRgx, $options: 'i' };
//     }

//     if(formData.cityId){
//       dbQuery.userCityId = mongoose.Types.ObjectId(formData.cityId);
//     }

//     if(formData.locationId){
//       dbQuery.userLocationId = mongoose.Types.ObjectId(formData.locationId);
//     }

//     if(formData.roleId){
//       dbQuery.userRoleId = mongoose.Types.ObjectId(formData.roleId);
//     }

//     if(formData.deptId){
//       dbQuery.userDeptId = mongoose.Types.ObjectId(formData.deptId);
//     }

//     if(formData.vaccinated){
//       dbQuery.isVaccinated = formData.vaccinated;
//     }
//     dbQuery.userType={$ne:'5'};
//     const searchRgx = rgx(search.trim());
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     const stsearch = new RegExp('\\b'+search+'\\b','i');
//     const userData = await AllUsers.aggregate([{$project:{'fullName':{$concat:['$userFirstName',' ','$userLastName']},
//       userMobile: 1,
//       userEmail: 1,userCityId:1,userLocationId:1,userFloorId:1,userType:1,userStatus:1,isVaccinated:1,
//       userRoleId:1,userDeptId:1,'insensitive': { '$toLower': '$userFirstName' },status:
//   {
//     $cond: { if: { $eq: [ '$userStatus', '1' ] }, then: 'Active', else: 'Inactive' }
//   }}},
//     {
//       $lookup:
//                        {
//                          from: 'all_building_by_clients',
//                          localField: 'userLocationId',
//                          foreignField: '_id',
//                          as: 'buildingName'
//                        }
                       
//     },
//     {
//       $lookup:
//                       {
//                         from: 'all_floor_by_clients',
//                         localField: 'userFloorId',
//                         foreignField: '_id',
//                         as: 'floorName'
//                       }
                      
//     },
//     {
//       $lookup:
//                        {
//                          from: 'spoc_roles_by_clients',
//                          localField: 'userRoleId',
//                          foreignField: '_id',
//                          as: 'roleName'
//                        }
                       
//     },
//     {
//       $lookup:
//                        {
//                          from: 'all_departments_by_clients',
//                          localField: 'userDeptId',
//                          foreignField: '_id',
//                          as: 'departmentName'
//                        }
                       
//     },
//     {
//       $set: {
//         buildingName: { $arrayElemAt: ['$buildingName.buildingName', 0] },
//         floorName: { $arrayElemAt: ['$floorName.floorName', 0] },
//         roleName: { $arrayElemAt: ['$roleName.roleName', 0] },
//         departmentName: { $arrayElemAt: ['$departmentName.departmentName', 0] }
//       }
//     },
//     {$match:{$or:[{'fullName':{ $regex: searchRgx, $options: 'i' }},
//       {userMobile:{ $regex: searchRgx, $options: 'i' }},
//       {userEmail:{ $regex: searchRgx, $options: 'i' }},
//       {buildingName:{ $regex: searchRgx, $options: 'i' }},
//       {floorName:{ $regex: searchRgx, $options: 'i' }},
//       {roleName:{ $regex: searchRgx, $options: 'i' }},
//       {departmentName:{ $regex: searchRgx, $options: 'i' }},
//       {status:{ '$regex': stsearch }}
//     ]}},
//     { $match: dbQuery }
                 
//     ]);

//     return userData;

//   } catch (err){
//     return err;
//   }
// };

// //---------------------------

// //----------------------------
// exports.getClientsMembersKpi = async (tenantDbConnection) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     const userData = await AllUsers.find({},{createdAt:0,__v:0,updatedAt:0});
//     return userData;
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getMemberProfile = async (tenantDbConnection, formData) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     const AllDept = await tenantDbConnection.model('all_departments_by_clients');
//     const userData = await AllUsers.findOne({ _id: formData.userId})
//       .populate([{path: 'userRoleId', select: 'roleName'},
//         {path: 'userCityId', select: 'cityName'}, 
//         {path: 'userLocationId', select: 'buildingName'},{path:'userFloorId',select: 'floorName'}]).lean();
//     const deptData = await AllDept.find({ spocId: {$in: formData.userId }},{_id:1,departmentName:1});
//     return {userData,deptData};
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getMemberProfileJwt = async (tenantDbConnection, uid) => {
//   try{
//     const AllUsers = await tenantDbConnection.model('all_users_by_clients');
//     const userData = await AllUsers
//       .findOne({ _id: uid},{userFirstName:1,userLastName:1,userMobile:1,
//         profileImageUrl:1,userEmail:1,userType:1,dateOfBirth:1,userBloodGp:1,isVaccinated:1,createdAt:1});
//     return userData;
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getClientsCity = async (tenantDbConnection, formData) => {
//   try{
//     const City = await tenantDbConnection.model('all_city_by_clients');
//     const cityData = await City.find({cityStatus:1}).select({ _id: 1, cityName: 1}).sort({ cityName: 'asc'});
//     return cityData;
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getBuildingByCity = async (tenantDbConnection, formData) => {
//   try{
//     const Building = await tenantDbConnection.model('all_building_by_clients');
//     const buildData = await Building
//       .find({ cityId: formData.cityId,buildingStatus:1 }).select({ _id: 1, buildingName: 1}).sort({ buildingName: 'asc'});
//     return buildData;
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getFloorByBuilding = async (tenantDbConnection, formData) => {
//   try{
//     const Floor = await tenantDbConnection.model('all_floor_by_clients');
//     const floorData = await Floor.find({ buildingId: formData.buildingId,floorStatus:1 })
//       .select({ _id: 1, floorName: 1}).sort({ floorName: 'asc'});
//     return floorData;
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getClientsRole = async (tenantDbConnection) => {
//   try{
//     const Role = await tenantDbConnection.model('spoc_roles_by_clients');
//     const roleData = await Role.find({ roleStatus: '1' }).select({ _id: 1, roleName: 1}).sort({ roleName: 'asc'});
//     return roleData;
//   } catch (err){
//     return false;
//   }
// };

// //----------------------------
// exports.getClientsDepartment = async (tenantDbConnection) => {
//   try{
//     const Department = await tenantDbConnection.model('all_departments_by_clients');
//     const deptData = await Department.find({departmentStatus:1})
//       .select({ _id: 1, departmentName: 1}).sort({ departmentName: 'asc'});
//     return deptData;
//   } catch (err){
//     return false;
//   }
// };
