const AppError = require("./../utils/apiError");

const handleCastErrorDB = (err) => {
  const message = `invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid Token", 401);

const handleJWTExpiredError = () =>
  new AppError("Token Expired", 401);

const handleDuplicateFieldsDB = (err) => {
  console.log(err);
  const message = `duplicate field value: ${err.keyValue.name}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(
    (el) => el.message,
  );
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.log("error boom", err);
    res.status(500).json({
      status: "error",
      message: "something is bad",
    });
  }
};

//any next that recieves an error goes here
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    console.log(err.name);
    if (err.name === "CastError")
      err = handleCastErrorDB(err);
    if (err.code === 11000)
      err = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError")
      err = handleValidationErrorDB(err);
    if (err.name === "JsonWebTokenError")
      err = handleJWTError();
    if (err.name === "TokenExpiredError")
      err = handleJWTExpiredError();

    sendErrorProd(err, res);
  }
  next();
};
