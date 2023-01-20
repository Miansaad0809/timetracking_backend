const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  assignProject,
  assignBranch,
  updateLockPin,
  lockScreen,
  unlockScreen,
  getProfile,
  updateUserAccess,
  ppa
} = require("../controllers/user");
const auth = require("../middlewares/auth");

router.route('/get-profile').get(auth, getProfile);
router.route("/assign-branch").post(
  	check("csrId", "Please add csr id to assign branch").not().isEmpty(),
    check("branchId", "Please add branch id to assign to csr").not().isEmpty(),
    auth, 
    assignBranch
);
router.route("/assign-project").post(
  	check("csrId", "Please add csr id to assign project").not().isEmpty(),
    check("projectId", "Please add project id to assign to csr").not(),
    auth, 
    assignProject
);
router.route("/update-lock-pin").put(
  	check("pin", "Please add pin for lock screen").not().isEmpty(),
    auth, 
    updateLockPin
);
router.route("/lock-screen").get(auth, lockScreen);
router.route("/unlock-screen").post(
  check("pin", "Please add pin to unlock screen").not().isEmpty(),
  auth, 
  unlockScreen
);
router.route("/ppa").post(
  check("password", "Please add password").not().isEmpty(),
  auth, 
  ppa
);
router.route("/update-user-access/:userId").post(auth, updateUserAccess);

module.exports = router;
