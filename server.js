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

var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});

app.get("/fund", async (req, res) => {
  const fund = await scraper.getFundData(req.body.url);
  res.status(200).send(fund);
});

app.get("/stock", async (req, res) => {
  const stock = await scraper.getStockData(req.body.url);
  res.status(200).send(stock);
});
