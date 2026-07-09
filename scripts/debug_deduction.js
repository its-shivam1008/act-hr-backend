const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require(path.join(__dirname, '../models/User'));
  const user = await User.findOne({ email: 'kipamo2487@aratrin.com' }).lean();
  const orgId = user.organisationId;
  
  const raw = await mongoose.connection.db.collection('labours').findOne({ organisationId: orgId });
  if (raw) {
    console.log('RAW Labour doc:', JSON.stringify(raw));
  } else {
    // find any labour
    const anyLab = await mongoose.connection.db.collection('labours').findOne({});
    console.log('ANY Labour doc:', JSON.stringify(anyLab));
  }
  
  mongoose.disconnect();
}).catch(e => console.error(e));
