const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"]
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"]
  },
  photo: {
    type: String,
    default: "default.jpg"
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user"
  },
  password: {
    type: String,
    required: [true, "User must have a password"],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, "Password confirmation is needed"],
    validate: {
      //This validation is only called during create and save operation
      validator: function(passwordConfirm) {
        return passwordConfirm === this.password;
      },
      message: "Passwords are not the same"
    }
  },
  lastPasswordUpdate: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

//Comment this middleware before importing dev-data, password in script already comes with encrypted password
userSchema.pre("save", async function(next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
  }
  next();
});

//Comment this middleware before importing dev-data, password in script already comes with encrypted password
userSchema.pre("save", function(next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.lastPasswordUpdate = Date.now() - 1000;

  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.validatePassword = async function(
  loginPassword,
  dbPassword
) {
  return await bcrypt.compare(loginPassword, dbPassword);
};

userSchema.methods.changedPasswordAfterTokenCreation = function(
  tokenCreationTime
) {
  let passwordUpdated = false;

  if (this.lastPasswordUpdate) {
    const lastPasswordUpdateTimestamp = parseInt(
      this.lastPasswordUpdate.getTime() / 1000,
      10
    );

    passwordUpdated = tokenCreationTime < lastPasswordUpdateTimestamp;
  }
  return passwordUpdated;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
