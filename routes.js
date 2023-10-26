const AuthRoutes = require("./routes/auth");
const TaskRoutes = require("./routes/task");

module.exports = function (app) {
    //all routes
  app.use("/api/auth", AuthRoutes);
  app.use("/api/task", TaskRoutes);
};
