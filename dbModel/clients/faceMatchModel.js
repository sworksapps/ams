const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const faceMatchSchema = async (dbconn) => {
  const faceMatchModel = new Schema({
    Height: { type: Number, default: 0.60, required: true },
    Width: { type: Number, default: 0.40, required: true },
    Brightness: { type: Number, default: 60, required: true },
    Sharpness: { type: Number, default: 60, required: true },
    EyesOpen: { type: Boolean, default: true, required: true },
    Eyeglasses: { type: Boolean, default: false, required: true },
    Sunglasses: { type: Boolean, default: false, required: true },
    MouthOpen: { type: Boolean, default: false, required: true },
    PitchMin: { type: Number, default: -5, required: true },
    PitchMax: { type: Number, default: 30, required: true },
    YawMin: { type: Number, default: -30, required: true },
    YawMax: { type: Number, default: 30, required: true },
    FaceMatchThreshold: { type: Number, default: 95, required: true },
    MaxFaceMatchThreshold: { type: Number, default: 98, required: true },
    MaxFaces: { type: Number, default: 10, required: true },
  }, {
    timestamps: true
  });
  dbconn.model('facematchdatas', faceMatchModel);
};

module.exports = {
  faceMatchSchema
};