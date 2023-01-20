const express = require('express');
const router = express.Router();
const { check } = require("express-validator");
const { getTasks, addEntry, getRecords, getSingleEntry, updateEntry, sendRequest, viewAllRequests, changeRequestStatus } = require('../controllers/tasks');

router.route('/tasks').get(getTasks);
router.route('/add-entry').post(
  check("taskId", "Please add task id to add time entry").not().isEmpty(),
  check("userId", "Please add user id to add time entry").not().isEmpty(),
  check("date", "Please add date").not().isEmpty(),
  check("duration", "Please add duration").not().isEmpty(),
  check("comment", "Please add comment").not().isEmpty(),
  addEntry
);
router.route('/records').get(getRecords);
router.route('/get-single-entry/:id').get(getSingleEntry);
router.route('/:id').put(
  check("date", "Please add date").not().isEmpty(),
  check("duration", "Please add duration").not().isEmpty(),
  check("comment", "Please add comment").not().isEmpty(),
  updateEntry
);
router.route('/send-request/:id').get(sendRequest);
router.route('/view-all-requests').get(viewAllRequests);
router.route('/change-request-status/:id').post(
  check("status", "Please add status").not().isEmpty(),
  changeRequestStatus
);

module.exports = router;