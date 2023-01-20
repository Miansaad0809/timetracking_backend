const { validationResult } = require('express-validator');
const Assignment = require("../models/Assignment");
const Task = require("../models/Task");
const Project = require("../models/Project");

exports.getTasks = async (req, res) => {
 try {
  let tasks = await Task.find().populate('project_id');
  res.status(200).json({ msg: "list of all tasks", data: tasks });
 } catch (err) {
  console.log(err);
  return res.status(500).json({ msg: "Server Error" });
 }
};

exports.addEntry = async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let entry = await Assignment.create({
      task_id: req.body.taskId,
      user_id: req.body.userId,
      date: req.body.date,
      duration: req.body.duration,
      comment: req.body.comment
    });

    return res.status(201).json({ msg: 'time entry has been added successfully', data: entry });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ msg: 'Server Error' })
  }
}

exports.getSingleEntry = async (req, res) => {
  try {
   let entry = await Assignment.findOne({_id: req.params.id});
   if(!entry) res.status(404).json({ msg: "no entry exists against id: "+ req.params.id });
   res.status(200).json({ msg: "single entry", data: entry });
  } catch (err) {
   console.log(err);
   return res.status(500).json({ msg: "Server Error" });
  }
 };

exports.updateEntry = async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let entry = await Assignment.findOne({_id: req.params.id});
    if(!entry) res.status(404).json({ msg: "no entry exists against id: "+ req.params.id });
    console.log(entry)
    Assignment.findByIdAndUpdate(req.params.id, {
      date: req.body.date,
      duration: req.body.duration,
      comment: req.body.comment,
      status: entry.requested? 'pending':null,
      remarks: null
    }, {new: true}, async(err, updated) => {
      if(err) return res.status(500).json({ msg: 'error occurred while updating the entry' });
      return res.status(200).json({ msg: 'time entry has been updated successfully', data: updated });
    });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ msg: 'Server Error' })
  }
}

exports.sendRequest = async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let entry = await Assignment.findOne({_id: req.params.id});
    if(!entry) res.status(404).json({ msg: "no entry exists against id: "+ req.params.id });
    Assignment.findByIdAndUpdate(req.params.id, {
      requested: true,
      status: 'pending',
      remarks: null
    }, {new: true}, async(err, updated) => {
      if(err) return res.status(500).json({ msg: 'error occurred while updating the entry' });
      return res.status(200).json({ msg: 'reqeuest send successfully', data: updated });
    });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ msg: 'Server Error' })
  }
}

exports.viewAllRequests = async (req, res) => {
  try {
   let requests = await Assignment.find({requested: true, status: 'pending'}).populate([{path: 'task_id', populate: {path: 'project_id', select: 'title'}}, {path: 'user_id'}]);
   res.status(200).json({ msg: "list of all requests", data: requests });
  } catch (err) {
   console.log(err);
   return res.status(500).json({ msg: "Server Error" });
  }
};

exports.changeRequestStatus = async(req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let entry = await Assignment.findOne({_id: req.params.id, status: 'pending', requested: true});
    if(!entry) res.status(404).json({ msg: "no request exists against id: "+ req.params.id });
    Assignment.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
      remarks: req.body.remarks
    }, {new: true}, async(err, updated) => {
      if(err) return res.status(500).json({ msg: 'error occurred while changing the status for request' });
      return res.status(200).json({ msg: 'entry status have been changed successfully', data: updated });
    });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ msg: 'Server Error' })
  }
}

exports.getRecords = async (req, res) => {
  try {
    let date = new Date();
    let tasks = new Array();
    if(req.query.type === 'monthly') {
      let month = (date.getMonth()+1 < 10)? '0'+(date.getMonth()+1):date.getMonth()+1;
      tasks = await Assignment.find({user_id: req.query.userId, created_at: {
        $gte: date.getFullYear()+"-"+month+"-"+"01T00:00:00.000Z",
        $lte: date.getFullYear()+"-"+month+"-"+"31T23:59:59.000Z"
      }}).populate({path: 'task_id', populate: {path: 'project_id', select: 'title'}});
    }
    if(req.query.type === 'weekly') {
      date.setDate(date.getDate()-7)
      tasks = await Assignment.find({user_id: req.query.userId, created_at: {
        $gte: date.toLocaleDateString(`fr-CA`).split('/').join('-')+"T00:00:00.000Z",
        $lte: new Date().toLocaleDateString(`fr-CA`).split('/').join('-')+"T23:59:59.000Z"
      }}).populate({path: 'task_id', populate: {path: 'project_id', select: 'title'}});
    }
    res.status(200).json({ msg: "list of all tasks", data: tasks });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: "Server Error" });
  }
 };

