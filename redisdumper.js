	var fs = require("fs");
    var redis = require("redis");
    var redisClient = redis.createClient();
    var mysql      = require('mysql');
    var sha256 = require("sha256");
    var sqlConnection = mysql.createConnection(JSON.parse(fs.readFileSync("config.json", "utf8")));
    function dump() {
      redis.keys("hugs_*", function(err, keys) {
        console.log(keys)
      })
    }
    dump();