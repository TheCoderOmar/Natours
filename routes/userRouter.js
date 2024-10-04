const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");
const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post(
  "/forgotPassword",
  authController.forgotPassword,
);
router.patch(
  "/resetPassword/:token",
  authController.resetPassword,
);

//protect all below
router.use(authController.protect);
router.get(
  "/me",
  userController.getMe,
  userController.getUser,
);

router.delete("/deleteMe", userController.deleteMe);

router.patch("/updateMe", userController.updateMe);

router.patch(
  "/updateMyPassword",
  authController.updatePassword,
);

//admin functions below
router.use(
  authController.restrictTo("admin", "lead-guide"),
);

router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);
router.route("/:id").get(userController.getUser);

module.exports = router;
