const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection
db.on("error", error => console.log(error))
db.once('open', () => console.log('Connected to Mongoose'))


const { Schema } = mongoose;

const userSchema = new Schema({
  username: String
});

const exerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.post("/api/users", (req, res) => {

  const usrname = req.body.username;
  const whereClause = { username: usrname };

  User.find(
    whereClause,
    (err, data) => {
      if (!err && data.username != undefined) {
        console.log('USER: ' + data.username);
        console.log('ID: ', data._id);
        res.send("Username already taken");
      } else {
        console.log(JSON.stringify(req.body));
        //get new record object
        const newRec = new User({ username: usrname });

        //save new record
        newRec.save((err, sRec) => {
          console.log('User saved ', JSON.stringify(sRec));
          res.json({ "username": sRec.username, "_id": sRec._id });
        });
      }
    }
  );
});

app.post("/api/users/:_id/exercises", (req, res) => {

  const query = req.body;
  const userId = req.params._id;
  const description = query.description;
  let duration = Number(query.duration);
  let date = new Date(query.date);

  if (query.date == undefined) {
    date = new Date();
  } else if (query.date.trim().length == 0) {
    date = new Date();
  }

  console.log('duration: ' + duration);
  console.log('date param: ' + query.date);
  console.log('date: ' + date);

  if (!description) {
    return res.send("Path 'description' is required.");
  }

  if (!duration) {
    return res.send("Path 'duration' is required.");
  }

  if (!Number.isInteger(duration)) {
    res.send('Cast to Number failed for value "' + query.duration + '" at path "duration"');
  }

  if (date == 'Invalid Date') {
    res.send('Cast to date failed for value "' + query.date + '" at path "date"');
  }

  User.findById(userId, (err, data) => {
    console.log("Error: " + err);
    console.log("data: " + data);

    if (err || (!data)) {
      res.send("Unknown userId");
    } else {
      //Insert Record
      const newRec = new Exercise({
        "userId": userId,
        "description": description,
        "duration": duration,
        "date": date
      });

      console.log("userId: " + userId);
      console.log('new record: ' + newRec);

      try {
        newRec.save((err, sRec) => {
          if (!err) {

            let dateStr = date.toDateString();
            //moment(date).format('ddd MMM DD YYYY');

            res.json({
              "_id": sRec.userId,
              "username": data.username,
              "description": description,
              "duration": duration,
              "date": dateStr
            });
          } else {
            res.json({
              "error": err
            });
          }
        });
      } catch (e) {
        console.log('exception: ' + e);
        res.json({ "error": e });
      }
    }
  });
});

app.get("/api/users", (req, res) => {
  User.find({}, (err, recs) => {
    const usersList = [];
    res.json(recs);
  });
});

app.get("/api/users/:_id/logs", (req, res) => {

  console.log('userId: ' + req.params._id);
  console.log('Query Parameters : ' + JSON.stringify(req.query));

  const queryParams = req.query;

  const userId = req.params._id;
  const fromDate = new Date(queryParams.from);
  const toDate = new Date(queryParams.to);
  const limit = Number(queryParams.limit);

  console.log('fromDate: ' + fromDate);
  console.log('toDate: ' + toDate);

  let fdStr = fromDate.toDateString();//moment(fromDate).format('ddd MMM DD YYYY');
  let tdStr = toDate.toDateString();//moment(toDate).format('ddd MMM DD YYYY');

  const rootJson = {}
  User.findById(userId, (err, uRec) => {

    console.log('ErrorLogs-> ' + err);

    if (err || (!uRec)) {
      res.send("Unknown userId");
    } else {
      getlog(uRec, rootJson);
    }
  });

  const getlog = (uRec, rootJson) => {

    rootJson["_id"] = uRec._id;
    rootJson["username"] = uRec.username;

    if (fromDate != 'Invalid Date') {
      rootJson["from"] = fdStr;
    }

    if (toDate != 'Invalid Date') {
      rootJson["to"] = tdStr;
    }

    //call function
    var logExercise = Exercise.find({ "userId": userId });
    logExercise.select(["description", "date", "duration"]);

    if (fromDate != 'Invalid Date') {
      logExercise.where('date').gte(fromDate);
    }

    if (toDate != 'Invalid Date') {
      logExercise.where('date').lte(toDate);
    }

    logExercise.sort({ date: -1 });
    logExercise.limit(limit);

    let recArr = [];

    logExercise.exec((err, recs) => {

      console.log('recs: -> ' + recs);

      rootJson["count"] = recs.length;

      if (recs.length > 0) {

        for (var rec of recs) {
          let recObj = {};
          //let recDateStr = moment(rec.date).format('ddd MMM DD YYYY');
          recObj["description"] = rec.description;
          recObj["duration"] = rec.duration;
          recObj["date"] = rec.date.toDateString();//recDateStr;
          recArr.push(recObj);
        }

        rootJson["log"] = recArr;
        res.json(rootJson);
      } else {
        rootJson["log"] = recArr;
        res.json(rootJson);
      }
    }); //end of fetch
  }
});
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
