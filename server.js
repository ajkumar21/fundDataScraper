const bodyParser = require("body-parser");
var express = require("express");
var scraper = require("./scraper");
var app = express();

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
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});

app.get("/fund", async (req, res) => {
  console.log(req.body.url);
  const fund = await scraper.getFundData(req.body.url);
  res.status(200).send(fund);
});

app.get("/stock", async (req, res) => {
  const stock = await scraper.getStockData(req.body.url);
  res.status(200).send(stock);
});
