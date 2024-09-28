const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
      },
    password: {
        type: String,
        required: true, 
    }
});

userSchema.pre(
  'save',
  async function(next) {
    if (this.isNew || this.isModified('password')) {
      const hash = await bcrypt.hash(this.password, 10);
      this.password = hash;
    }
    next();
  }
);

userSchema.methods.isValidPassword = async function(password) {
    const user = this;
    const compare = await bcrypt.compare(password, user.password);
  
    return compare;
};

const UserModel = mongoose.model('user', userSchema);

module.exports = UserModel;