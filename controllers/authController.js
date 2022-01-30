const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    httpOnly: true
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    lastPasswordUpdate: req.body.lastPasswordUpdate,
    role: req.body.role
  });

  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exists in request body
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  //2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("Incorrect login credetnials", 401));
  }

  const isValidPassword = await user.validatePassword(password, user.password);

  if (!isValidPassword) {
    return next(new AppError("Incorrect login credetnials", 401));
  }

  // 3) It everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if exists
  const authorizationHeader = req.headers.authorization;
  let token;

  if (authorizationHeader && authorizationHeader.startsWith("Bearer")) {
    token = authorizationHeader.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("User is not logged in yet.", 401));
  }

  //2) Token verification
  const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user exists
  const user = await User.findById(payload.id);

  if (!user) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exists",
        401
      )
    );
  }

  //4) Check if user changed passwords after the JWT was issued
  if (user.changedPasswordAfterTokenCreation(payload.iat)) {
    return next(
      new AppError(
        "A password modification after token creation was detected, please log in again.",
        401
      )
    );
  }

  req.user = user;
  res.locals.user = user;

  next();
});

exports.isUserLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      const payload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const user = await User.findById(payload.id);

      if (!user) {
        return next();
      }

      //4) Check if user changed passwords after the JWT was issued
      if (user.changedPasswordAfterTokenCreation(payload.iat)) {
        return next();
      }

      //If execution reaches this point it means there is a logged in user
      // user object is put in res.locals  so that pug templates can access it
      res.locals.user = user;
      // next();
    }
  } catch (error) {
    return next();
  }
  return next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "User does not have permission to perform this action",
          403
        )
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError(`No user found by email address: ${req.body.email}`, 404)
    );
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!"
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(new AppError("There was an error sending the email", 500));
  }

  //return response
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  //2) If token has not expired, and there is user, set the password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  //3) Update changePasswordAt property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //4 Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("password");

  // 2) Check if posted current password is correct
  const passwordMatches = await user.validatePassword(
    req.body.currentPassword,
    user.password
  );

  if (!passwordMatches) {
    return next(
      new AppError("currentPassword does not match database password", 400)
    );
  }

  // 3) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
