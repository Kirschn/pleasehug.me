// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

// Code to run if we're in a worker process
} else {
    var redis = require("redis");
    var redisClient = redis.createClient();
    var mysql      = require('mysql');
    var sqlConnection = mysql.createConnection({
      host     : 'localhost',
      user     : 'pleasehugme',
      password : 'secret',
      database : 'pleasehugme'
    });
    redisClient.on("error", function(err) {
        console.log("Redis Error: " + err);
    })
    // Include Express
    var express = require('express');

    // Create a new Express application
    var app = express();

    // Add a basic route – index page
    app.get('/api/hug/:user', function (req, res) {
        if (req.params.user !== undefined && req.params.user !== "") {
            if (req.params.user.indexOf(" ") !== -1) {
                res.send(redis.incr(req.params.user));
                res.end();
            }
        }
    });
    app.get('/api/profile/:user', function (req, res) {
        if (req.params.user !== undefined && req.params.user !== "") {
            if (req.params.user.indexOf(" ") !== -1) {
                var sql = "SELECT bgimg, username FROM profiles WHERE username = ?";
                sqlConnection.query(sql, [req.params.user], function(err, res) {
                    if (err) throw err;
                });
                res.send(JSON.stringify({
                    "hugs": redis.get(req.params.user)
                }));
                res.end();
            }
        }
    });

    // Bind to a port
    app.listen(3000);
    console.log('Application running!');

}