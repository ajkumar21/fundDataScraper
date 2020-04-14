const bodyParser = require("body-parser");
var express = require("express");
var scraper = require("./scraper");
var app = express();
const MongoClient = require("mongodb").MongoClient;

const connectionString =
  "mongodb+srv://admin:admin@fundmanagerdata-zei2j.mongodb.net/test?retryWrites=true&w=majority";

MongoClient.connect(connectionString, {
  useUnifiedTopology: true,
})
  .then((client) => {
    console.log("Connected to mongoDB");
    const db = client.db("fundData");
    const fundCollection = db.collection("funds");

    app.post("/fundDB", (req, res) => {
      fundCollection
        .insertOne(req.body.link)
        .then((result) => console.log(result))
        .catch((err) => console.error(err));
    });

    app.delete("/fundDB", (req, res) => {
      fundCollection
        .deleteOne(req.body.link)
        .then((result) => console.log(result))
        .catch((err) => console.error(err));
    });
  })
  .catch((err) => console.error(err));

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

app.get("/fund", (req, res) => {
  if (req.headers["link"]) {
    scraper.getFundData(req.headers.link).then((fund) => {
      console.log(fund);
      if (fund.name) {
        res.status(200).send(fund);
      } else {
        res.status(404).send("Not Found");
      }
    });
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
