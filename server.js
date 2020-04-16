const bodyParser = require("body-parser");
var express = require("express");
var scraper = require("./scraper");
var app = express();
const MongoClient = require("mongodb").MongoClient;

const redis = require("redis");
//May need URL, check heroku docs
const cache = redis.createClient();

cache.on("connect", () => console.log("Redis connected"));
cache.on("error", (err) => console.log(`Redis connection failed: ${err}`));

//Create middleware cache for endpoints
const getFromCache = (req, res, next) => {
  const key = `${req.url}${req.headers.link}`;
  cache.get(key, (err, result) => {
    if (err == null && result != null) {
      res.send("from cache");
    } else {
      next();
    }
  });
};

const connectionString =
  "mongodb+srv://admin:admin@fundmanagerdata-zei2j.mongodb.net/test?retryWrites=true&w=majority";

MongoClient.connect(connectionString, {
  useUnifiedTopology: true,
})
  .then((client) => {
    console.log("MongoDB connected");
    const db = client.db("fundData");
    const fundCollection = db.collection("funds");

    app.post("/fundDB", (req, res) => {
      if (req.headers.link) {
        fundCollection.insertOne({ link: req.headers.link }, (err, result) => {
          if (err) {
            res.status(400).send(err);
          } else {
            res.status(200).send(result);
          }
        });
      } else {
        res.status(400).send("Link not found in headers");
      }
    });

    app.delete("/fundDB", (req, res) => {
      if (req.headers.link) {
        fundCollection.deleteOne({ link: req.headers.link }, (err, result) => {
          if (err) {
            res.status(400).send(err);
          } else {
            res.status(200).send(result);
          }
        });
      } else {
        res.status(400).send("Link not found in headers");
      }
    });

    app.get("/fundDB", (req, res) => {
      fundCollection.find().toArray((err, items) => {
        if (err) {
          res.status(400).send(err);
        } else {
          res.status(200).send(items);
        }
      });
    });
  })
  .catch((err) => console.error(`MongoDB connection failed: ${err}`));

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Link"
  );
  next();
});

var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});

app.get("/fund", getFromCache, (req, res) => {
  if (req.headers["link"]) {
    const fundLink = req.headers.link;
    scraper
      .getFundData(fundLink)
      .then((fund) => {
        if (fund.name) {
          res.status(200).send(fund);
          const key = `${req.url}${fundLink}`;
          cache.setex(key, 60, JSON.stringify(fund));
        } else {
          res.status(404).send("Not Found");
        }
      })
      .catch((err) => console.log(err));
  } else {
    res.status("400").send("Bad Request: Link not found in header");
  }
});

app.get("/stock", (req, res) => {
  if (req.headers["link"]) {
    scraper.getStockData(req.headers.link).then((stock) => {
      if (stock.name) {
        res.status(200).send(stock);
      } else {
        res.status(404).send("Not Found");
      }
    });
  } else {
    res.status("400").send("Bad Request: Link not found in header");
  }
});
