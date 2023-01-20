const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
	project_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "project",
		default: null,
	},
	title: {
		type: String,
		required: true,
	},
	created_at: {
		type: Date,
		default: Date.now,
	}
});

module.exports = Task = mongoose.model("task", TaskSchema);
