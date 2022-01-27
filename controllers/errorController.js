const AppError = require("../utils/appError");

const handleJWTError = () => new AppError("Invalid access token", 401);

const handleTokenExpiredError = () =>
  new AppError("Access token has expired", 401);

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const value = err.keyValue.name;
  const message = `Duplicate field found: ${value}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(
    responseError => responseError.message
  );
  console.log(errors);
  const message = `Invalid input data: [${errors.join("|")}]`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  console.log(`Dev Error: ${err}`);

  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  return res.status(err.statusCode).render("error", {
    title: "Something went very wrong!",
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  console.log(`Prod Error: ${err}`);
  //Back-end error handler
  if (req.originalUrl.startsWith("/api")) {
    //known error
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    //Unexpected error
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong!"
    });
  }

  //Front-end error handler

  //known error
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something went very wrong!",
      msg: err.message
    });
  }

  //Unexpected error
  return res.status(err.statusCode).render("error", {
    title: "Something went very wrong!",
    msg: "Please try again later"
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    //https://www.javascripttutorial.net/object/3-ways-to-copy-objects-in-javascript/
    // let error = { ...err };
    // let error = Object.assign({}, err);

    let error = JSON.parse(JSON.stringify(err));

    //Work around to copy message property to the final error send back in response
    error.message = err.message;

    if (error.name === "CastError") error = handleCastErrorDB(error);

    if (error.code === 11000) error = handleDuplicateFieldsDB(error);

    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);

    if (error.name === "JsonWebTokenError") error = handleJWTError();

    if (error.name === "TokenExpiredError") error = handleTokenExpiredError();

    sendErrorProd(error, req, res);
  }
};
