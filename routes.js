const AuthRoutes = require("./routes/auth");
const TaskRoutes = require("./routes/task");

module.exports = function (app) {
  app.use("/api/auth", AuthRoutes);
  app.use("/api/task", TaskRoutes);
};
