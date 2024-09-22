const fs = require("fs");
const User = require("./../models/userModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/apiError");
const factory = require("./handlerFactory");

const users = JSON.parse(
  fs.readFileSync(`${__dirname}/../data/users.json`),
);

const filterObejct = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError("this route is not for password", 400),
    );
  }

  const filteredBody = filterObejct(
    req.body,
    "name",
    "email",
  );
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "Success", // Indicate that the request was successful
    results: users.length,
    data: { users },
  });
});

exports.getUser = factory.getOne(User);

exports.createUser = (req, res) => {
  // Generate a unique ID for the new user based on the current timestamp
  const newId = Date.now();

  // Create a new user object by merging the new ID with the data from the request body
  const newUser = Object.assign({ _id: newId }, req.body);

  // Add the new user to the existing list of users
  users.push(newUser);

  // Write the updated list of users to the JSON file
  fs.writeFile(
    `${__dirname}/data/users.json`,
    JSON.stringify(users),
    (err) => {
      if (err) {
        // Log the error to the console and send a failure response if an error occurs
        console.error("Error writing to file:", err);
        return res.status(500).json({
          status: "fail",
          message: "Error writing to file",
        });
      }

      // Send a success response with the newly created user data if the file write operation succeeds
      res.status(201).json({
        status: "success",
        data: { user: newUser }, // Corrected to reflect that a user, not tours, is being returned
      });
    },
  );
};

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    active: false,
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.deleteUser = factory.deleteOne(User);
// dont update password
exports.updateUser = factory.updateOne(User);
