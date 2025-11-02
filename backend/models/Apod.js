import mongoose from "mongoose";

const apodSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  media_type: {
    type: String,
    required: true,
    enum: ["image", "video"]
  }
}, {
  timestamps: true
});

const Apod = mongoose.model("Apod", apodSchema);

export default Apod;

