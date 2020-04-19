const bodyParser = require("body-parser");
var express = require("express");
var scraper = require("./scraper");
const MongoClient = require("mongodb").MongoClient;
const redis = require("redis");
const axios = require("axios");

const port = process.env.REDIS_PORT;
const host = process.env.REDIS_HOST;
const password = process.env.REDIS_PW;

const cache = redis.createClient({ port, host, password });

cache.on("connect", () => console.log("Redis connected"));
cache.on("error", (err) => console.log(`Redis connection failed: ${err}`));

const TIME_IN_CACHE = 60 * 60; //1hr in seconds

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
    "Origin, X-Requested-With, Content-Type, Accept, Link"
  );
  next();
});

//Create middleware cache for endpoints
const getFromCache = (req, res, next) => {
  const keySuffix = req.headers.link || "";
  const key = `${req.url}${keySuffix}`;

  cache.get(key, (err, result) => {
    if (err == null && result != null) {
      res.send(JSON.parse(result));
      console.log("from cache");
    } else {
      //if not found use next callback - which will be the axios call
      next();
    }
    ``;
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
          cache.setex(key, TIME_IN_CACHE, JSON.stringify(fund));
        } else {
          res.status(404).send("Not Found");
        }
      })
      .catch((err) => console.log(err));
  } else {
    res.status("400").send("Bad Request: Link not found in header");
  }
});

app.get("/stock", getFromCache, (req, res) => {
  if (req.headers["link"]) {
    const fundLink = req.headers.link;
    scraper.getStockData(fundLink).then((stock) => {
      if (stock.name) {
        res.status(200).send(stock);
        const key = `${req.url}${fundLink}`;
        cache.setex(key, TIME_IN_CACHE, JSON.stringify(stock));
      } else {
        res.status(404).send("Not Found");
      }
    });
  } else {
    res.status("400").send("Bad Request: Link not found in header");
  }
});

// const baseUrl = "https://www.alphavantage.co/query?function=";
// const apiKey = process.env.MARKET_API_KEY;

// app.get("/marketData/:symbol", getFromCache, (req, res) => {
//   const functionApi = "TIME_SERIES_INTRADAY";
//   const apiUrl = `${baseUrl}${functionApi}&symbol=${req.params.symbol}&interval=1min&apikey=${apiKey}`;
//   axios
//     .get(apiUrl)
//     .then((market) => {
//       //1 min lag for live data
//       if (market.data["Time Series (1min)"]) {
//         const symbolData = market.data["Time Series (1min)"];
//         const latestSymbolData = symbolData[Object.keys(symbolData)[0]];
//         res.status("200").send(latestSymbolData);
//         cache.setex(req.url, 60, JSON.stringify(latestSymbolData));
//       } else {
//         res.status("404").send("ERROR: Invalid symbol. Cannot find stock data");
//       }
//     })
//     .catch((err) => console.log(err));
// });

// app.get("/marketData/history/:symbol", getFromCache, (req, res) => {
//   const functionApi = "TIME_SERIES_DAILY";
//   const apiUrl = `${baseUrl}${functionApi}&symbol=${req.params.symbol}&apikey=${apiKey}`;

//   axios
//     .get(apiUrl)
//     .then((market) => {
//       //1 min lag for live data
//       if (market.data["Time Series (Daily)"]) {
//         const symbolData = market.data["Time Series (Daily)"];
//         res.status("200").send(symbolData);
//         cache.setex(req.url, 60, JSON.stringify(symbolData));
//       } else {
//         res.status("404").send("ERROR: Invalid symbol. Cannot find stock data");
//       }
//     })
//     .catch((err) => console.log(err));
// });

const baseUrl = "https://financialmodelingprep.com/api/v3/";

app.get("/marketData/:symbol", getFromCache, (req, res) => {
  axios
    .get(`${baseUrl}quote/^${req.params.symbol}`)
    .then((response) => {
      const data = response.data;
      if (data.length > 0) {
        res.status("200").send(data);
        cache.setex(req.url, 60, JSON.stringify(data));
      } else {
        res.status("404").send("ERROR: Invalid symbol. Cannot find stock data");
      }
    })
    .catch((err) => console.log(err));
});

app.get("/marketData/history/:symbol", getFromCache, (req, res) => {
  axios
    .get(`${baseUrl}historical-chart/1min/^${req.params.symbol}`)
    .then((response) => {
      const data = response.data;
      if (data.length > 0) {
        res.status("200").send(data);
        cache.setex(req.url, 60, JSON.stringify(data));
      } else {
        res.status("404").send("ERROR: Invalid symbol. Cannot find stock data");
      }
    })
    .catch((err) => console.log(err));
});
