const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", authController.isUserLoggedIn, viewsController.getOverview);

router.get(
  "/tour/:slug",
  authController.isUserLoggedIn,
  viewsController.getTour
);

router.get("/login", authController.isUserLoggedIn, viewsController.logIn);

router.get("/me", authController.protect, viewsController.getAccount);

router.get("/my-tours", authController.protect, viewsController.getMyTours);

router.post(
  "/submit-user-data",
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
