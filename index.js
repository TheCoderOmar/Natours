const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const AppError = require("./utils/apiError");
const globalError = require("./controllers/errorController");
const tourRouter = require("./routes/tourRouter");
const userRouter = require("./routes/userRouter");
const reviewRouter = require("./routes/reviewRouter");
const viewRouter = require("./routes/viewRouter");
const cookieParser = require("cookie-parser");
const { whitelist } = require("validator");
const app = express();
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
//middleware

//security HTTP
app.use(helmet());

//to use maps
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "style-src 'self' https://unpkg.com https://fonts.googleapis.com;",
  );
  return next();
});

//development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//limit requests
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message:
    "TOO MANY REQUESTS FROM THIS IP, please try again later",
});
app.use("/api", limiter);

//body parser
app.use(
  express.json({
    limit: "10kb",
  }),
);
app.use(cookieParser());
//data sanatization NOSQL
app.use(mongoSanitize());

//data sanatization XSS
app.use(xss());
//prevent parm polution

app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  }),
);

app.use(express.static(path.join(__dirname, "public")));

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

app.all("*", (req, res, next) => {
  /*   res.status(404).json({
    status: "fail",
    message: `can't find ${req.originalUrl}`,
  }); */

  next(new AppError(`can't find ${req.originalUrl}`, 404));
});

app.use(globalError);
module.exports = app;
