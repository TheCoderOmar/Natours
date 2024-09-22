const AppError = require("../utils/apiError");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const sendEmail = require("./../utils/email");
const { Stats } = require("fs");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        process.env.JWT_COOKIE_EXPIRES_IN *
          24 *
          60 *
          60 *
          1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production")
    cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    //role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      new AppError(
        "Please provide emailand password!",
        400,
      ),
    );
  }

  const user = await User.findOne({ email }).select(
    "+password",
  );

  if (
    !user ||
    !(await user.correctPassword(password, user.password))
  ) {
    return next(
      new AppError("Incorrect email or password", 401),
    );
  }
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not logged in", 401));
  }

  //verify token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
  );

  //if user is deleted
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(new AppError("User deleted", 401));
  }

  //check if user changed password
  if (!freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("changed password login again", 401),
    );
  }

  //grant access
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("no permission", 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(
  async (req, res, next) => {
    // get user based on Posted email
    const user = await User.findOne({
      email: req.body.email,
    });

    if (!user) {
      return next(
        new AppError(
          "there is no user with this email",
          404,
        ),
      );
    }

    //generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //send email
    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;
    const message = `forgot your password? submit a PATCH request with your new password and confirmPassword to: ${resetURL} if you didnt please ignore it`;

    try {
      await sendEmail({
        email: user.email,
        subject: "token valid for 10 mins",
        message,
      });
      res.status(200).json({
        status: "success",
        message: "token sent to email",
      });
    } catch (err) {
      user.passwordResetExpires = undefined;
      user.passwordResetToken = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          "There was an error sending the email.",
        ),
        500,
      );
    }
  },
);

exports.resetPassword = catchAsync(
  async (req, res, next) => {
    //get User Based on the token

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    // if the token has not expired and there is a user set new pass
    if (!user) {
      return next(
        new AppError(
          "Token is invalid or has expired",
          400,
        ),
      );
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // update changedPasserod
    createSendToken(user, 200, res);
  },
);

exports.updatePassword = catchAsync(
  async (req, res, next) => {
    //get user
    const user = await User.findById(req.user._id).select(
      "+password",
    );
    //check if posted current pass is correct
    if (
      !(await user.correctPassword(
        req.body.passwordCurrent,
        user.password,
      ))
    ) {
      return next(
        new AppError("your current password is wrong", 401),
      );
    }
    //update pass
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;

    await user.save();
    createSendToken(user, 200, res);
    //log user in
  },
);
