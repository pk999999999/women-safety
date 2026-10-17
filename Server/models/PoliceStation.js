const mongoose = require('mongoose');

const policeStationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat] — GeoJSON standard
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  phone: [{ type: String }],
  email: { type: String, default: '' },
  zone: { type: String, default: '' },
  officerInCharge: { type: String, default: '' },
  type: {
    type: String,
    enum: ['city', 'rural', 'railway', 'cyber', 'control_room', 'helpline'],
    default: 'city'
  },
  category: {
    type: String,
    enum: ['station', 'helpline', 'command'],
    default: 'station'
  },
  address: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: true });

// Geospatial 2dsphere index for $near queries
policeStationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PoliceStation', policeStationSchema);
