var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var search = express.Router();

search.use(bodyParser.urlencoded({
  extended: true
}));

search.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// gets all areaIds of an owner
search.get('/area/:ownerId', function(req, res, next) {

  var params = {
    TableName: "Areas",
    KeyConditionExpression: "#owner = :owner_id",
    ExpressionAttributeNames: {
      "#owner": "ownerId"
    },
    ExpressionAttributeValues: {
      ":owner_id": req.params.ownerId
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.write(JSON.stringify(data, null, 2));
      res.end();
    }
  });
});

// gets all sensorgroups in an area
search.get('/sensorgroup_in_area/:areaId', function(req, res) {
  var params = {
    TableName: "Sensor_Group",
    KeyConditionExpression: "#area = :area_id",
    ExpressionAttributeNames: {
      "#area": "areaId"
    },
    ExpressionAttributeValues: {
      ":area_id": req.params.areaId
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');
  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Read. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log(JSON.stringify(data, null, 2));
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

// gets all sensors in sensorgroup
search.get('/sensors_in_group/:groupId', function(req, res) {
  var params = {
    TableName: "Sensors",
    KeyConditionExpression: "#group = :group_id",
    ExpressionAttributeNames: {
      "#group": "groupId"
    },
    ExpressionAttributeValues: {
      ":group_id": req.params.groupId
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');
  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Read. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Get item succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

//gets single sensorId
search.get('/sensors/:sensortype/:sensorid', function(req, res) {
  var d = new Date();
  var adjust;

  if (req.params.sensortype == "AIR_HUMIDITY") {
    adjust = 73000;
  } else if (req.params.sensortype == "AIR_TEMPERATURE") {
    adjust = 73000;
  } else {
    adjust = 7300000;
  }

  // each sensor has a different time sync
  var params = {
    TableName: req.params.sensortype,
    ProjectionExpression: "sensorId, #time_id, #v",
    KeyConditionExpression: "sensorId = :sensor_id and #time_id > :t1",
    ExpressionAttributeNames: {
      "#time_id": "timestamp",
      "#v": "value"
    },
    ExpressionAttributeValues: {
      ":sensor_id": req.params.sensorid,
      ":t1": (d.getTime() - adjust)
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');
  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

// gets all sensors with same owner
search.get('/sensors_owned/:ownerId', function(req, res) {
  var params = {
    TableName: "Sensors",
    FilterExpression: "#owner = :owner_id",
    ExpressionAttributeNames: {
      "#owner": "ownerId"
    },
    ExpressionAttributeValues: {
      ":owner_id": req.params.ownerId
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      // print all the movies
      console.log("Scan succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

module.exports = search;
