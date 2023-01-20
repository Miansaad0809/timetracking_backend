const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	created_at: {
		type: Date,
		default: Date.now,
	}
});

module.exports = Project = mongoose.model("project", ProjectSchema);
