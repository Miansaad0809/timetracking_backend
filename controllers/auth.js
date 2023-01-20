const { validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const ObjectID = require("mongodb").ObjectId;

exports.login = async (req, res) => {
 try {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
console.log(req.body)
  const email = req.body.email;
  const password = req.body.password;

  let user = await User.findOne({ email }).select("+password");

  if (user) {
   const isMatch = await bcrypt.compare(password, user.password);
   if (!isMatch) return res.status(400).json({ msg: "This password is invalid. Please try again" });
   res.status(200).json({ msg: "user logged in", data: user });
  } else {
   return res.status(404).json({ msg: "user not found againt this email" });
  }
 } catch (err) {
  console.log(err);
  return res.status(500).json({ msg: "Server Error" });
 }
};
exports.getAllFingerprints = async (req, res) => {
 try {
  let superAdmin = await Designation.findOne({ title: "super-admin" }).select("_id");
  let users = await User.find({ Designation: { $ne: superAdmin._id }, active: true, fingerprint: { $ne: null } })
   .select("fingerprint")
   .populate({ path: "profile", select: "branch_id" });
  return res.status(200).json({ msg: "list of all fingerprints", data: users });
 } catch (err) {
  return res.status(500).json({ msg: "Server Error" });
 }
};
exports.markAttendance = async (req, res) => {
 try {
  let { currentTime, formattedDate } = getCurrentTime();
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  let devices = await Device.findOne({ devices: { $elemMatch: { $eq: req.body.uuid } } });
  if (!devices) return res.status(400).json({ msg: "this device is not link to software, so cannot mark attendance" });
  let user = await User.findOne({ _id: req.body.userId, active: true }).populate({ path: "profile" });
  if (!user) return res.status(404).json({ msg: "no user found against id: " + req.body.userId });
  let attendanceSetting = await AttendanceSetting.findOne({ branch_id: req.body.branchId });
  if (!attendanceSetting) return res.status(404).json({ msg: "no Branch Settings found against id: " + req.body.branchId });
  let { timings, general, fines, advance } = attendanceSetting;

  let ExemptedFromFine = await Exemption("exemption_of_fine", user, advance);
  let ExemptedFromAttendance = await Exemption("exemption_of_attendance", user, advance);
  if (ExemptedFromAttendance) return res.status(200).json({ msg: "User Exempted from attendance " });
  let holiday = await CustomHoliday(attendanceSetting._id);
  if (holiday) return res.status(200).json({ msg: "Its off day cannot mark attendance" });

  if (await IsUserOnLeave(user, "approved")) {
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { status: "approvedLeave" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
    }
   );
   return res.status(200).json({ msg: "Cannot mark attendance as you are on leave " });
  } else if (await IsUserOnLeave(user, "rejected")) {
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { status: "unapprovedleave" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
     if (!ExemptedFromFine && getLateFine(fines)) {
      await Penalty.create({ user_id: req.body.userId, reason: "attendance", type: "unapprovedleave", amount: getPenaltyOnUnapprovedLeave(fines) });
      await UserLedger.create({ user_id: req.body.userId, title: "unapprovedleave", amount: getPenaltyOnUnapprovedLeave(fines), entry_type: "debit", record_type: "penalty" });
     }
    }
   );
   return res.status(200).json({ msg: "Cannot mark attendance as you are on leave " });
  }

  let checkInTime = timings.enterance_time.to ? timings.enterance_time.to : timings.enterance_time.from;
  let { exit_time, late_time, mid_day_time } = timings;
  let checkAttendance = await Attendance.findOne({ user_id: req.body.userId, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } });

  //present
  if (((getTimeAsNumberOfMinutes(currentTime) >= getTimeAsNumberOfMinutes(timings.enterance_time.from)) && ((getTimeAsNumberOfMinutes(currentTime) <= getTimeAsNumberOfMinutes(timings.enterance_time.to)))) && (getTimeAsNumberOfMinutes(currentTime) <= getTimeAsNumberOfMinutes(late_time))) {
   if (checkAttendance?.checkin_time) return res.status(409).json({ msg: "Attendance Already Marked 1" });
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, checkin_time: { $eq: null }, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { checkin_time: currentTime, status: "present" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
     return res.status(200).json({ msg: "Attendance marked successfully", data: attendanceMarked });
    }
   );
  }
  // late
  else if (getTimeAsNumberOfMinutes(currentTime) >= getTimeAsNumberOfMinutes(late_time) && getTimeAsNumberOfMinutes(currentTime) <= getTimeAsNumberOfMinutes(mid_day_time)) {
   if (checkAttendance?.checkin_time) return res.status(409).json({ msg: "attendance already marked 2" });
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, checkin_time: { $eq: null }, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { checkin_time: currentTime, status: "late" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
     if (!ExemptedFromFine && getLateFine(fines)) {
      await Penalty.create({ user_id: req.body.userId, reason: "attendance", type: "late attendance", amount: getLateFine(fines) });
      await UserLedger.create({ user_id: req.body.userId, title: "late attendance", amount: getLateFine(fines), entry_type: "debit", record_type: "penalty" });
     }
     return res.status(200).json({ msg: "attendance marked as late", data: attendanceMarked });
    }
   );
  }
  // half day && getTimeAsNumberOfMinutes(currentTime) < getTimeAsNumberOfMinutes(checkout_before_time)
  
  else if ((getTimeAsNumberOfMinutes(currentTime) > getTimeAsNumberOfMinutes(mid_day_time)) && (getTimeAsNumberOfMinutes(currentTime) <= getTimeAsNumberOfMinutes(exit_time))) {
   if (checkAttendance?.checkin_time) return res.status(409).json({ msg: "Attendance Already marked 3" });
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, checkin_time: { $eq: null }, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { checkin_time: currentTime, status: "halfDay" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
     if (!ExemptedFromFine && getPenaltyOnMidDayLeaveWithoutInforming(fines)) {
      await Penalty.create({ user_id: req.body.userId, reason: "attendance", type: "mid day leave without informing", amount: getPenaltyOnMidDayLeaveWithoutInforming(fines) });
      await UserLedger.create({
       user_id: req.body.userId,
       title: "mid day leave without informing",
       amount: getPenaltyOnMidDayLeaveWithoutInforming(fines),
       entry_type: "debit",
       record_type: "penalty",
      });
     }
     return res.status(200).json({ msg: "attendance marked as half day", data: attendanceMarked });
    }
   );
  }
  // checkOutBeforeTime getTimeAsNumberOfMinutes(currentTime) >= getTimeAsNumberOfMinutes(checkout_before_time) &&
  else if (checkAttendance?.checkin_time && (getTimeAsNumberOfMinutes(currentTime) <= getTimeAsNumberOfMinutes(exit_time))) {
   if (!checkAttendance?.checkin_time) return res.status(404).json({ msg: "your checkin was not found so you cannot checkout" });
   if (checkAttendance?.checkout_time) return res.status(409).json({ msg: "already marked checkout" });
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, checkout_time: { $eq: null }, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { checkout_time: currentTime, status: "checkOutBeforeTime" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
     if (!ExemptedFromFine && getCheckoutBeforeTimePenalty(fines))
      await Penalty.create({ user_id: req.body.userId, reason: "attendance", type: "mid day leave without informing", amount: getCheckoutBeforeTimePenalty(fines) });
     await UserLedger.create({ user_id: req.body.userId, title: "mid day leave without informing", amount: getCheckoutBeforeTimePenalty(fines), entry_type: "debit", record_type: "penalty" });
     return res.status(200).json({ msg: "Checked out before time", data: attendanceMarked });
    }
   );
  }
  // checkout
  else if (getTimeAsNumberOfMinutes(currentTime) >= getTimeAsNumberOfMinutes(exit_time)) {
   if (!checkAttendance?.checkin_time) return res.status(404).json({ msg: "your checkin was not found so you cannot checkout" });
   if (checkAttendance?.checkout_time) return res.status(409).json({ msg: "already marked checkout" });
   Attendance.findOneAndUpdate(
    { user_id: req.body.userId, checkout_time: { $eq: null }, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` } },
    { checkout_time: currentTime, status: "present" },
    { new: true },
    async (err, attendanceMarked) => {
     if (err) return res.status(500).json({ msg: "error occured while marking attendance" });
     return res.status(200).json({ msg: "checked out successfully", data: attendanceMarked });
    }
   );
  } else 
   return res.status(400).json({msg: 'no time for check in/ check out'});
 } catch (err) {
  console.log(err);
  if (err.kind === "ObjectId") return res.status(400).json({ msg: "invalid id format" });
  return res.status(500).json({ msg: "Server Error" });
 }
};

const getCurrentTime = () => {
 const convertTime12to24 = (time12h) => {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = parseInt(hours, 10) + 12;
  return `${hours}:${minutes}`;
 };

 let date = new Date();
 let hours = date.getHours();
 let minutes = date.getMinutes();
 let ampm = hours >= 12 ? "PM" : "AM";
 hours = hours % 12;
 hours = hours ? hours : 12;
 minutes = minutes < 10 ? "0" + minutes : minutes;
 let currentTime = convertTime12to24(hours + ":" + minutes + " " + ampm);
 let formattedDate = date.toLocaleDateString(`fr-CA`).split("/").join("-");
 return { currentTime, formattedDate };
};
const Exemption = async (field, user, advance) => {
 let status = false;

 let userDesignation = user?.designation_id;
 if (!userDesignation) status = false;
 let exemption = advance[field];
 if (!exemption.status) status = false;
 if (exemption.level.designation.status) {
  let designations = exemption.level.designation.designations;
  if (designations.length == 0) status = false;
  let desigIds = designations.map((b) => ObjectID(b.desig_id).valueOf());
  if (desigIds.includes(ObjectID(userDesignation).toString())) status = true;
  else status = false;
 }

 if (exemption.level.employee.status) {
  let employees = exemption.level.employee.employees;
  if (employees.length == 0) status = false;
  let empIds = employees.map((b) => ObjectID(b.emp_id).valueOf());
  if (empIds.includes(ObjectID(user._id).toString())) status = true;
  else status = false;
 }

 return status;
};
const CustomHoliday = async (settingId) => {
 let holiday = false;
 let day = new Date().getDate();
 let month = new Date().toLocaleString("en-US", { month: "short" });
 let year = new Date().getFullYear();
 let date = `${day} ${month} ${year}`;
 let events = await Event.find({ attendence_settings_id: settingId });
 for (const event of events) {
  if (event.event_date == date) holiday = true;
 }
 return holiday;
};
const IsUserOnLeave = async (user, status) => {
 let todaysDate = getFormattedTodaysDate();
 let leave = false;
 let record = await AttendanceRecord.findOne({ user_id: user._id, status }).populate("leaves_record");
 if (!record) return (leave = false);

 let leavesRecord = record?.leaves_record;
 for (const records of leavesRecord) {
  if (records?.no_of_days.includes(todaysDate)) leave = true;
 }
 return leave;
};
const getLateFine = (fines) => {
 let fine = null;
 if (fines.late_penalty.status) fine = fines.late_penalty.fine;
 return fine;
};
const getCheckoutBeforeTimePenalty = (fines) => {
 let fine = null;
 if (fines.penalty_on_checkout_without_informing.status) fine = fines.penalty_on_checkout_without_informing.fine;
 return fine;
};
const getPenaltyOnMidDayLeaveWithoutInforming = (fines) => {
 let fine = null;
 if (fines.penalty_on_mid_day_leave_without_informing.status) fine = fines.penalty_on_mid_day_leave_without_informing.fine;
 return fine;
};
const getFormattedTodaysDate = () => {
 let today = new Date();
 let date, month, year;
 date = today.getDate();
 month = today.getMonth() + 1;
 year = today.getFullYear();
 if (date < 10) date = "0" + date;
 if (month < 10) month = "0" + month;
 date = date.toString().padStart(2, "0");
 month = month.toString().padStart(2, "0");
 return `${date}/${month}/${year}`;
};
const getPenaltyOnUninformedLeave = (fines) => {
 let fine = 0;
 if (fines.penalty_on_uninformed_leave.status) fines = fines.penalty_on_uninformed_leave.fine;
 return fine;
};
const getPenaltyOnUnapprovedLeave = (fines) => {
 let fine = 0;
 if (fines.penalty_on_unapproved_leave.status) fines = fines.penalty_on_unapproved_leave.fine;
 return fine;
};
const getAbsentFine = (fines) => {
 let fine = 0;
 if (fines.absent_penalty.status) fines = fines.absent_penalty.fine;
 return fine;
};
const getTimeAsNumberOfMinutes = (time) => {
 let timeParts = time.split(":");
 let timeInMinutes = timeParts[0] * 60 + timeParts[1];
 return parseInt(timeInMinutes);
};

exports.updateToken = async (req, res) => {
 try {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  User.findByIdAndUpdate({ _id: req.user._id }, { token: req.body.token }, async (err, updated) => {
   if (err) return res.status(500).json({ msg: "error occured while updating token" });
   return res.status(200).json({ msg: "token updated" });
  });
 } catch (err) {
  return res.status(500).json({ msg: "Server Error" });
 }
};
