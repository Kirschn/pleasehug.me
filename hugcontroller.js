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
	var fs = require("fs");
	var homepageTemplate = fs.readFileSync("homepage.html", "utf8");
	var userTemplate = fs.readFileSync("usertemplate.html", "utf8");
	var escape = require('escape-html');
	var bodyParser = require('body-parser')
    var redis = require("redis");
    var redisClient = redis.createClient();
    var mysql      = require('mysql');
    var sha256 = require("sha256");
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
    app.use( bodyParser.json() );       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
      extended: true
    }));
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
                sqlConnection.query(sql, [req.params.user], function(err, result) {
                    if (err) throw err;
                    if (result[0] !== undefined) {
                    	res.send(JSON.stringify({
                    	    "hugs": redis.get(req.params.user)
                    	    "background": result[0].bgimg,
                    	    "username": result[0].username
                    	}));
                    	res.end();
                    } else {
                    	res.status(404).end();
                    }
                });
            }
        }
    });
    app.get('/api/hugs/:user', function (req, res) {
        if (req.params.user !== undefined && req.params.user !== "") {
            if (req.params.user.indexOf(" ") !== -1) {
                res.send(redis.get(req.params.user));
                res.end();
            }
        }
    });
    app.post('/api/updateprofile', function (req, res) {
    	if (req.body.username !== undefined && req.body.password !== undefined) {
    		if (req.body.background !== undefined) {
    			if (req.body.background.indexOf("https://sharepic.moe/") == 0 && req.body.background.indexOf("/raw") !== -1) {
    				// valid sharepic raw url
    				var passwordhash = sha256(req.body.password);
    				var sql = "UPDATE profiles (bgimg) VALUES (?) WHERE username = ? AND passwordhash = ?";
    				sqlConnection.query(sql, [req.body.background, req.body.username, passwordhash], function(err) {
    					if (err) throw err;
    					res.end("ok");
    				});
    			}
    		}
    	}
    });
    app.post('/api/createprofile', function(req, res) {
    	if (req.body.username !== undefined && req.body.password !== undefined) {
    		// create a new account
    		var bg = null;
    		if (req.body.background !== undefined) {
    			if (req.body.background.indexOf("https://sharepic.moe/") == 0 && req.body.background.indexOf("/raw") !== -1) {
    				// we got a valid url!
    				bg = req.body.background;
    			}
    		}
    		var sql = "INSERT INTO profiles SET ?";
    		var insertValues = {
    			username: req.body.username,
    			passwordhash: sha256(req.body.password),
    			bgimg: bg
    		};
    		sqlConnection.query(sql, insertValues, function(err) {
    			if (err) throw err;
    			res.write(req.body.username);
    			res.end();
    		});

    	}
    })
    app.get('/', function(req,res) {
    	res.send(homepageTemplate);
    	res.end();
    });
    app.get('/:user', function(req, res) {
    	if (req.params.user.indexof(" ") == -1) {
    		var sql = "SELECT bgimg FROM profiles WHERE username = ?";
    		sqlConnection.query(sql, [req.params.user], function(err, results) {
    			if (err) throw err;
    			if (results[0] !== undefined) {
    				res.send(usertemplate.replace("::username::", escape(req.params.user))
    					.replace("::bgimg::", results[0].bgimg)
    					.replace("::hugs::", redis.get(req.params.user))).end();
    			} else {
    				res.status(404).end("not found");
    			}
    		});
    	}
    });

    // Bind to a port
    app.listen(3000);
    console.log('Application running!');

}