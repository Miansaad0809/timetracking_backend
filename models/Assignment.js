const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema({
	user_id: { 
		type: mongoose.Schema.Types.ObjectId, 
		ref: "user", 
		required: true 
	}, 
	task_id: {
		type: mongoose.Schema.Types.ObjectId, 
		ref: "task", 
		required: true 
	},
 	date: { 
		type: String, 
		default: null 
	},
 	duration: { 
		type: String, 
		default: null 
	},
 	comment: { 
		type: String, 
		default: null 
	},
	requested: {
		type: Boolean,
		default: false
	},
	status: {
		type: String,
		enum: [null, 'pending', 'approved', 'rejected'],
		default: null
	},
	remarks: {
		type: String,
		default: null
	},
 	created_at: { 
		type: Date, 
		default: Date.now 
	}
});

module.exports = mongoose.model("assignment", AssignmentSchema);
