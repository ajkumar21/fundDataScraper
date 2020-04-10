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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.get("/fund", async (req, res) => {
  const fund = await scraper.getFundData(req.body.url);
  res.status(200).send(fund);
});

app.get("/stock", async (req, res) => {
  const stock = await scraper.getStockData(req.body.url);
  res.status(200).send(stock);
});
