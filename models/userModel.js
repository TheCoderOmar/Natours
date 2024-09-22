const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { validate } = require("./tourModel");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "a name must be provided"],
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  email: {
    type: String,
    required: [true, "an email must be provided"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "email incorrect"],
  },
  photo: {
    type: String,
  },
  password: {
    type: String,
    required: [true, "please provide a passsword"],
    minlength: 8,
    select: false,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordConfirm: {
    type: String,
    required: [true, "please confirm the passsword"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "PASSWORD NOT THE SAME",
    },
  },
  passwordResetToken: String,
  passwordResetExpires: String,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) {
    return next();
  }
  //because the database can be slow
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function (
  candiatePassword,
  userPassword,
) {
  return await bcrypt.compare(
    candiatePassword,
    userPassword,
  );
};

userSchema.methods.changedPasswordAfter = async function (
  JWTTimeStamp,
) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimeStamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 600000;
  console.log("resetTT", resetToken);
  console.log(
    "passwordResetToken",
    this.passwordResetToken,
  );
  return resetToken;
};

userSchema.pre(/^find/, function (next) {
  this.find({
    active: { $ne: false },
  });
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
