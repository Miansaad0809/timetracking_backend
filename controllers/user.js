const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Branch = require('../models/Branch');
const UserPermission = require('../models/UserPermission');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');

exports.getProfile = async(req, res) => {
    try {
        let user = await User.findOne({_id: req.user._id, active: true}).populate([{path: 'designation_id dep_id level_id profile userPermissions userPerformance'}, {path: 'branch_id', populate: {path: 'accounts', populate: 'account_id'}}]);
        let notifications = await Notification.find({user_id: req.user._id, read: false}).limit(3);
        let unReadNotificationsCount = await Notification.countDocuments({user_id: req.user._id, read: false});
        let date = new Date();
        const formattedDate = date.toLocaleDateString(`fr-CA`).split("/").join("-");
        let attendance = await Attendance.findOne({user_id: req.user._id, created_at: { $gte: `${formattedDate}T00:00:00.000Z`, $lt: `${formattedDate}T23:59:59.999Z` }, checkin_time: {$ne: null}, checkout_time: {$eq: null}});
        return res.status(200).json({ msg: "user logged in profile", data: user, notifications: notifications, notificationsCount: unReadNotificationsCount, checkedIn: !attendance? true:false });
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.ppa = async(req, res) => {
    try {
        let user = await User.findOne({ _id: req.user._id }).select('+password');
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "This password is incorrect" });
        return res.status(200).json({ msg: "password matched" });
    } catch (err) {
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.assignBranch = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        let csr = await User.findById(req.body.csrId).populate('designation_id');
        if(!csr || csr.designation_id.title !== 'csr') return res.status(404).json({ msg: 'no csr exists against id: '+req.body.csrId});
        let checkBranch = await Branch.findOne({ _id: req.body.branchId });
        if (!checkBranch) return res.status(404).json({ msg: "no branch exists against id: "+req.body.branchId });
        User.findOneAndUpdate({_id: req.body.csrId}, {branch_id: req.body.branchId}, {new: true}, function(err, user) {
            if (err) return res.status(400).json({ msg: "error occured while assigning branch to csr", err: err });
            return res.status(200).json({ msg: "branch assigned to csr successfully", data: user });
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.assignProject = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        let csr = await User.findById(req.body.csrId).populate('designation_id').populate('profile');
        if(!csr || csr.designation_id.title !== 'csr') return res.status(404).json({ msg: 'no csr exists against id: '+req.body.csrId});
        if(!csr.branch_id) return res.status(400).json({ msg: 'first assign branch to csr then project will be assigned'});
        if(req.body.projectId.length > 0) {
            let checkProject = await Project.findOne({ _id: req.body.projectId });
            if (!checkProject) return res.status(404).json({ msg: "no project exists against id: "+req.body.projectId });
            // let checkCsrBranch = false;
            // for(let x = 0; x < checkProject.branches.length; x++) {
            //     if (checkProject.branches[x].branch_id.toString() === csr.profile[0].branch_id.toString()) checkCsrBranch = true;
            // }
            // if(!checkCsrBranch) return res.status(400).json({ msg: 'project with id: '+req.body.projectId+' not assigned to csr branch' })
        }
        Profile.findOneAndUpdate({user_id: req.body.csrId}, {project_id: (req.body.projectId.length > 0)? req.body.projectId:null}, {new: true}, function(err, updatedUser) {
            if (err) return res.status(400).json({ msg: "error occured while assigning project to csr", err: err });
            return res.status(200).json({ msg: "project assigned to csr successfully", data: updatedUser });
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.updateLockPin = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        User.findOneAndUpdate({_id: req.user._id}, {pin: req.body.pin}, {new: true}, function(err, user) {
            if (err) return res.status(400).json({ msg: "error occured while updating lock screen pin", err: err });
            return res.status(200).json({ msg: "lock screen pin updated successfully", data: user });
        })
    } catch (err) {
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.lockScreen = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        let user = await User.findOne({_id: req.user._id}).select('+pin');
        if(!user.pin) return res.status(400).json({ msg: "cannot lock your screen first add pin for lock screen" });
        User.findOneAndUpdate({_id: req.user._id}, {lock: true}, {new: true}, function(err, user) {
            if (err) return res.status(400).json({ msg: "error occured while locking screen", err: err });
            return res.status(200).json({ msg: "screen locked successfully successfully" });
        })
    } catch (err) {
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.unlockScreen = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        let user = await User.findOne({_id: req.user._id}).select('+pin');
        if(user.pin !== req.body.pin) return res.status(400).json({ msg: "invalid pin" });
        await user.updateOne({lock: false})
        return res.status(200).json({ msg: "screen unlocked successfully"});
    } catch (err) {
        return res.status(500).json({ msg: 'Server Error' })
    }
}

exports.updateUserAccess = async(req, res) => {
    try {
        let user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ msg: "no user exists against id " + req.params.userId });
        let departments = JSON.parse(req.body.departments);
        let designations = JSON.parse(req.body.designations);
        let spab = JSON.parse(req.body.spab);
        let level = JSON.parse(req.body.level);
        let branches = JSON.parse(req.body.branches);
        let employees = JSON.parse(req.body.employees);
        let projects = JSON.parse(req.body.projects);
        let leverages = JSON.parse(req.body.leverages);
        let inventory = JSON.parse(req.body.inventory);
        let promotions = JSON.parse(req.body.promotions);
        let offers = JSON.parse(req.body.offers);
        let leadhub = JSON.parse(req.body.leadhub);
        let leadSetting = JSON.parse(req.body.leadSetting);
        let signal = JSON.parse(req.body.signal);
        let clients = JSON.parse(req.body.clients);
        let supplier = JSON.parse(req.body.supplier);
        let token = JSON.parse(req.body.token);
        let sale = JSON.parse(req.body.sale);
        let attendanceSetting = JSON.parse(req.body.attendanceSetting);
        let managementQuota = JSON.parse(req.body.managementQuota);
        let accounts = JSON.parse(req.body.accounts);
        let payStatement = JSON.parse(req.body.payStatement);
        let requests = JSON.parse(req.body.requests);
        let devices = JSON.parse(req.body.devices);
        UserPermission.findOneAndUpdate({user_id: user._id}, {
            'departments.view': departments.view,
            'departments.add': departments.add,
            'departments.edit': departments.edit,
            'departments.assign_hod': departments.assign_hod,
            'designations.view': designations.view,
            'designations.add': designations.add,
            'designations.edit': designations.edit,
            "spab.view": spab.view,
            "spab.add": spab.add,
            "spab.edit": spab.edit,
            "level.add": level.add,
            "level.edit": level.edit,
            "branches.view": branches.view,
            "branches.add": branches.add,
            "branches.edit": branches.edit,
            "branches.performance": branches.performance,
            "branches.assign_project": branches.assign_project,
            "branches.assign_branch": branches.assign_branch,
            "employees.view": employees.view,
            "employees.add": employees.add,
            "employees.edit": employees.edit,
            "employees.view_profile": employees.view_profile,
            "employees.view_history": employees.view_history,
            "projects.categories.view": projects.categories.view,
            "projects.categories.add": projects.categories.add,
            "projects.categories.edit": projects.categories.edit,
            "projects.property_types.view": projects.propertyTypes.view,
            "projects.property_types.add": projects.propertyTypes.add,
            "projects.property_types.edit": projects.propertyTypes.edit,
            "projects.cities.view": projects.cities.view,
            "projects.cities.add": projects.cities.add,
            "projects.cities.edit": projects.cities.edit,
            "projects.projects.view": projects.projects.view,
            "projects.projects.add": projects.projects.add,
            "projects.projects.edit": projects.projects.edit,
            "leverages.view": leverages.view,
            "leverages.add": leverages.add,
            "leverages.edit": leverages.edit,
            "leverages.publish": leverages.publish,
            "inventory.view": inventory.view,
            "inventory.add": inventory.add,
            "inventory.edit": inventory.edit,
            "promotions.view": promotions.view,
            "promotions.add": promotions.add,
            "promotions.edit": promotions.edit,
            "promotions.extend": promotions.extend,
            "offers.view": offers.view,
            "offers.add": offers.add,
            "offers.edit": offers.edit,
            "offers.extend": offers.extend,
            "leadhub.view": leadhub.view,
            "leadhub.pull_leads": leadhub.pull_leads,
            "leadhub.push_leads": leadhub.push_leads,
            "lead_setting.view": leadSetting.view,
            "lead_setting.edit": leadSetting.edit,
            "signal.view": signal.view,
            "signal.add": signal.add,
            "signal.edit": signal.edit,
            "clients.view": clients.view,
            "clients.add": clients.add,
            "clients.edit": clients.edit,
            "clients.initiate_buyback": clients.initiate_buyback,
            "supplier.view": supplier.view,
            "supplier.add": supplier.add,
            "supplier.edit": supplier.edit,
            "token.view": token.view,
            "token.add": token.add,
            "token.edit": token.edit,
            "sale.view": sale.view,
            "sale.add": sale.add,
            "sale.edit": sale.edit,
            "attendance_setting.view": attendanceSetting.view,
            "attendance_setting.edit": attendanceSetting.edit,
            "management_quota.token.view": managementQuota.token.view,
            "management_quota.token.add": managementQuota.token.add,
            "management_quota.token.edit": managementQuota.token.edit,
            "management_quota.sale.view": managementQuota.sale.view,
            "management_quota.sale.add": managementQuota.sale.add,
            "management_quota.sale.edit": managementQuota.sale.edit,
            "accounts.transactions.view": accounts.transactions.view,
            "accounts.transactions.add": accounts.transactions.add,
            "accounts.transactions.edit": accounts.transactions.edit,
            "pay_statement.view": payStatement.view,
            "pay_statement.edit": payStatement.edit,
            "requests.view": requests.view,
            "requests.edit": requests.edit,
            "devices.view": devices.view,
            "devices.edit": devices.edit
        }, {new: true}, async (err, updated) => {
            if(err) return res.status(500).json({ msg: "error occurred while updating permissions"});
            return res.status(200).json({ msg: "user permissions updated successfully", data: updated});
        })
    } catch (err) {
        return res.status(500).json({ msg: 'Server Error' })
    }
}