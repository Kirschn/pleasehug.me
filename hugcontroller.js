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
	var userTemplate = fs.readFileSync("userpage.html", "utf8");
	var escape = require('escape-html');
	var bodyParser = require('body-parser')
    var redis = require("redis");
    var redisClient = redis.createClient();
    var mysql      = require('mysql');
    var sha256 = require("sha256");
    var config = fs.readFileSync("config.json", "utf8")
    var sqlConnection = mysql.createConnection(config);
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
		console.log("Hug for " + req.params.user);
        if (req.params.user !== undefined && req.params.user !== "") {
            if (req.params.user.indexOf(" ") == -1) {
				redisClient.incr("hugs_" + req.params.user, function(err, resultRed) {
					if (err) throw err;
					res.send(String(resultRed));
					res.end();
				});
                
            } else {
				res.end()
			}
        }
    });
    app.get('/api/profile/:user', function (req, res) {
		console.log("profile!");
        if (req.params.user !== undefined && req.params.user !== "") {
            if (req.params.user.indexOf(" ") !== -1) {
                var sql = "SELECT bgimg, username FROM profiles WHERE username = ?";
                sqlConnection.query(sql, [req.params.user], function(err, result) {
                    if (err) throw err;
                    if (result[0] !== undefined) {
						redisClient.get("hugs_" + req.params.user, function(err, resultHug) {
							res.send(JSON.stringify({
                    	    "hugs": resultHug,
                    	    "background": result[0].bgimg,
                    	    "username": result[0].username
                    	}));
                    	res.end();
						});
                    	
                    } else {
                    	res.status(404).end();
                    }
                });
            }
        }
    });
    app.get('/api/hugs/:user', function (req, res) {
		console.log("Hugs for " + req.params.user);
        if (req.params.user !== undefined && req.params.user !== "") {
            if (req.params.user.indexOf(" ") == -1) {
				redisClient.get("hugs_" + req.params.user, function(err, respRed) {
						res.send(respRed);
						res.end();
				});
                
            }
        }
		
    });
    app.post('/api/updateprofile', function (req, res) {
		console.log("update!");
    	if (req.body.username !== undefined && req.body.password !== undefined) {
    		if (req.body.background !== undefined) {
    			if (req.body.background.indexOf("https://sharepic.moe/") == 0) {
                    if (req.body.background.indexOf("/raw") == -1 && req.body.background.indexOf(".") == -1) {
                        req.body.background += "/raw"
                    }
    				// valid sharepic raw url
    				var passwordhash = sha256(req.body.password);
    				var sql = "UPDATE profiles SET bgimg = ? WHERE username = ? AND passwordhash = ?";
    				sqlConnection.query(sql, [req.body.background, req.body.username, passwordhash], function(err) {
    					if (err) throw err;
    					res.end("Account updated!");
    				});
    			}
    		}
    	}
    });
    app.post('/api/createprofile', function(req, res) {
		console.log("new!");
    	if (req.body.username !== undefined && req.body.password !== undefined) {
    		// create a new account
    		var bg = null;
    		if (req.body.background !== undefined) {
    			if (req.body.background.indexOf("https://sharepic.moe/") == 0) {
    				// we got a valid url!
    				bg = req.body.background;
    			}
    		}
    		var sql = "SELECT username FROM profiles WHERE username = ?"
    		sqlConnection.query(sql, [req.body.username], function(err, results) {
				if (err) throw err;
				if (results[0] == undefined) {
					var sql = "INSERT INTO profiles SET ?";
					var insertValues = {
						username: req.body.username.substr(0,25),
						passwordhash: sha256(req.body.password),
						bgimg: bg
					};
					sqlConnection.query(sql, insertValues, function(err) {
						if (err) throw err;
						res.write("Okay! Here is your URL to get hugged: <a href='https://pleasehug.me/" + escape(req.body.username) + "'>pleasehug.me/" + escape(req.body.username) + "</a>.");
						res.end();
					});

				} else {
					res.write("This profile already exists FeelsBadMan");
					res.end();
				}
    		});
    		
    	}
    })
    
    app.get('/:user', function(req, res) {
		console.log("User for " + req.params.user);
    	if (req.params.user.indexOf(" ") == -1) {
    		var sql = "SELECT bgimg FROM profiles WHERE username = ?";
    		sqlConnection.query(sql, [req.params.user], function(err, results) {
    			if (err) throw err;
    			if (results[0] !== undefined) {
					redisClient.get("hugs_" + req.params.user, function(err, respRed) {
						res.send(userTemplate.replace("::username::", escape(req.params.user))
    					.replace("::bgimg::", results[0].bgimg)
    					.replace("::hugs::", respRed))
    					.end();
					});
    			} else {
    				res.status(404).end("not found");
    			}
    		});
    	}
    });
    app.get('/', function(req,res) {
		console.log("home!");
    	res.send(homepageTemplate);
    	res.end();
    });

    // Bind to a port
    app.listen(3432);
    console.log('Application running!');

}