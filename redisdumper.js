	var fs = require("fs");
    var redis = require("redis");
    var redisClient = redis.createClient();
    var mysql      = require('mysql');
    var sha256 = require("sha256");
    var sqlConnection = mysql.createConnection(JSON.parse(fs.readFileSync("config.json", "utf8")));
    function dump() {
      redisClient.keys("hugs_*", function(err, keys) {
        keys.forEach(function(currentKey) {
          redisClient.get(currentKey, function(err, hugs) {
            if (err) throw err;
            var sql = "UPDATE profiles SET hugs = ? WHERE username = ?";
            sqlConnection.query(sql, [hugs, currentKey.substr(5)], function (err) {
              if (err) throw err;
            });
          })
        })
      })
    }
    setInterval(function () {
      console.log("dumping...");
      dump();
    }, 5000)